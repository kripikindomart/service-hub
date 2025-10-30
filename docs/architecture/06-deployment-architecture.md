# Deployment Architecture - Multi-Tenant Service Management Platform

## Deployment Overview

Platform ini menggunakan **Container-based Microservices Deployment** dengan Orchestration yang支持 horizontal scaling, high availability, dan disaster recovery. Deployment dirancang untuk multi-environment (development, staging, production) dengan CI/CD pipeline yang terotomatisasi.

## Infrastructure Architecture

### 1. Cloud Infrastructure Stack

#### Primary Cloud Provider Options
```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUD INFRASTRUCTURE                         │
├─────────────────────────────────────────────────────────────────┤
│  Option 1: AWS (Recommended)                                    │
│  • Compute: EC2 instances with Auto Scaling Groups             │
│  • Container: EKS (Elastic Kubernetes Service)                 │
│  • Database: RDS MySQL with Read Replicas                      │
│  • Cache: ElastiCache Redis                                    │
│  • Storage: S3 buckets                                         │
│  • CDN: CloudFront                                             │
│  • Load Balancer: Application Load Balancer (ALB)              │
│  • Monitoring: CloudWatch                                      │
│                                                                 │
│  Option 2: Google Cloud Platform                               │
│  • Compute: Compute Engine with Managed Instance Groups        │
│  • Container: GKE (Google Kubernetes Engine)                   │
│  • Database: Cloud SQL for MySQL                              │
│  • Cache: Memorystore for Redis                               │
│  • Storage: Cloud Storage                                      │
│  • CDN: Cloud CDN                                              │
│  • Load Balancer: Cloud Load Balancing                        │
│  • Monitoring: Stackdriver Monitoring                          │
│                                                                 │
│  Option 3: Azure                                                │
│  • Compute: Virtual Machine Scale Sets                         │
│  • Container: AKS (Azure Kubernetes Service)                   │
│  • Database: Azure Database for MySQL                         │
│  • Cache: Azure Cache for Redis                               │
│  • Storage: Azure Blob Storage                                 │
│  • CDN: Azure CDN                                               │
│  • Load Balancer: Azure Load Balancer                          │
│  • Monitoring: Azure Monitor                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Kubernetes Cluster Architecture

#### Cluster Design
```yaml
# k8s/cluster/cluster-config.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: platform-cluster
  namespace: default
spec:
  clusterNetwork:
    pods:
      cidrBlocks: ["10.128.0.0/14"]
    services:
      cidrBlocks: ["172.30.0.0/16"]
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1beta1
    kind: KThreesControlPlane
    name: platform-control-plane
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: AWSManagedCluster
    name: platform-infrastructure

---
# Node pools for different workloads
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: KThreesControlPlane
metadata:
  name: platform-control-plane
spec:
  replicas: 3
  version: v1.28.0
  kthreesConfigSpec:
    serverConfig:
      - --kube-apiserver-arg=audit-policy-file=/etc/kubernetes/audit-policy.yaml
      - --kube-apiserver-arg=audit-log-path=/var/log/kubernetes/audit.log
      - --kube-apiserver-arg=audit-log-maxage=30
      - --kube-apiserver-arg=audit-log-maxbackup=10
      - --kube-apiserver-arg=audit-log-maxsize=100

---
# Application node pool
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AWSMachineTemplate
metadata:
  name: app-node-template
spec:
  template:
    spec:
      instanceType: m5.large
      sshKeyName: platform-key
      rootVolume:
        sizeGiB: 50
        type: gp3
      additionalSecurityGroups:
        - id: sg-app-nodes
      subnet:
        id: subnet-private-1

---
# Database node pool
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AWSMachineTemplate
metadata:
  name: db-node-template
spec:
  template:
    spec:
      instanceType: r5.large
      sshKeyName: platform-key
      rootVolume:
        sizeGiB: 100
        type: io2
        iops: 3000
      additionalSecurityGroups:
        - id: sg-db-nodes
      subnet:
        id: subnet-db-1
```

### 3. Namespace Architecture

#### Namespace Organization
```yaml
# k8s/namespaces/namespaces.yaml
---
# Core platform services
apiVersion: v1
kind: Namespace
metadata:
  name: platform-core
  labels:
    environment: production
    team: platform
    security-level: high

---
# Application services
apiVersion: v1
kind: Namespace
metadata:
  name: platform-apps
  labels:
    environment: production
    team: application
    security-level: medium

---
# Monitoring and logging
apiVersion: v1
kind: Namespace
metadata:
  name: platform-monitoring
  labels:
    environment: production
    team: devops
    security-level: medium

---
# Development environment
apiVersion: v1
kind: Namespace
metadata:
  name: platform-dev
  labels:
    environment: development
    team: development
    security-level: low

---
# Staging environment
apiVersion: v1
kind: Namespace
metadata:
  name: platform-staging
  labels:
    environment: staging
    team: qa
    security-level: medium

---
# Tenant-specific namespaces (dynamically created)
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-{tenant-id}
  labels:
    environment: production
    team: tenant
    tenant-id: "{tenant-id}"
    security-level: high
```

## Application Deployment

### 1. Backend Services Deployment

#### API Gateway Deployment
```yaml
# k8s/services/api-gateway/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: platform-core
  labels:
    app: api-gateway
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: api-gateway
        image: platform/api-gateway:1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: METRICS_PORT
          value: "9090"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: platform-secrets
              key: redis-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: platform-secrets
              key: jwt-secret
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: platform-secrets
              key: core-database-url
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: tmp
        emptyDir: {}
      - name: logs
        emptyDir: {}
      imagePullSecrets:
      - name: registry-credentials
      nodeSelector:
        node-type: application
      tolerations:
      - key: "application"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - api-gateway
              topologyKey: kubernetes.io/hostname

---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: platform-core
  labels:
    app: api-gateway
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  - port: 9090
    targetPort: 9090
    protocol: TCP
    name: metrics
  selector:
    app: api-gateway

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway
  namespace: platform-core
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/hsts: "true"
    nginx.ingress.kubernetes.io/hsts-max-age: "31536000"
    nginx.ingress.kubernetes.io/hsts-include-subdomains: "true"
spec:
  tls:
  - hosts:
    - api.platform.com
    secretName: api-gateway-tls
  rules:
  - host: api.platform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
```

#### Microservice Deployment Template
```yaml
# k8s/services/template/microservice-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${SERVICE_NAME}
  namespace: platform-core
  labels:
    app: ${SERVICE_NAME}
    version: v1
    service-type: microservice
spec:
  replicas: ${REPLICAS}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: ${SERVICE_NAME}
  template:
    metadata:
      labels:
        app: ${SERVICE_NAME}
        version: v1
        service-type: microservice
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
        sidecar.istio.io/inject: "true"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      initContainers:
      - name: migration
        image: platform/${SERVICE_NAME}:${VERSION}
        command: ["npm", "run", "migrate"]
        envFrom:
        - secretRef:
            name: platform-secrets
        volumeMounts:
        - name: migrations
          mountPath: /app/migrations
      containers:
      - name: ${SERVICE_NAME}
        image: platform/${SERVICE_NAME}:${VERSION}
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: SERVICE_NAME
          value: "${SERVICE_NAME}"
        - name: METRICS_PORT
          value: "9090"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: platform-secrets
              key: ${DATABASE_SECRET_KEY}
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: platform-secrets
              key: redis-url
        envFrom:
        - configMapRef:
            name: platform-config
        - secretRef:
            name: platform-secrets
        resources:
          requests:
            cpu: ${CPU_REQUEST}
            memory: ${MEMORY_REQUEST}
          limits:
            cpu: ${CPU_LIMIT}
            memory: ${MEMORY_LIMIT}
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: tmp
        emptyDir: {}
      - name: logs
        emptyDir: {}
      - name: migrations
        emptyDir: {}
      imagePullSecrets:
      - name: registry-credentials
      nodeSelector:
        node-type: application
      tolerations:
      - key: "application"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - ${SERVICE_NAME}
              topologyKey: kubernetes.io/hostname

---
apiVersion: v1
kind: Service
metadata:
  name: ${SERVICE_NAME}
  namespace: platform-core
  labels:
    app: ${SERVICE_NAME}
    service-type: microservice
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  - port: 9090
    targetPort: 9090
    protocol: TCP
    name: metrics
  selector:
    app: ${SERVICE_NAME}

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${SERVICE_NAME}-hpa
  namespace: platform-core
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${SERVICE_NAME}
  minReplicas: ${MIN_REPLICAS}
  maxReplicas: ${MAX_REPLICAS}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### 2. Frontend Deployment

#### Next.js Application Deployment
```yaml
# k8s/frontend/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: platform-apps
  labels:
    app: frontend
    tier: frontend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
        tier: frontend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: frontend
        image: platform/frontend:1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.platform.com"
        - name: NEXT_PUBLIC_APP_URL
          value: "https://platform.com"
        - name: NEXT_PUBLIC_SENTRY_DSN
          valueFrom:
            secretKeyRef:
              name: platform-secrets
              key: sentry-dsn
        resources:
          requests:
            cpu: 50m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/.next/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
      imagePullSecrets:
      - name: registry-credentials

---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: platform-apps
  labels:
    app: frontend
    tier: frontend
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: frontend

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend
  namespace: platform-apps
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Frame-Options: DENY";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-XSS-Protection: 1; mode=block";
      more_set_headers "Strict-Transport-Security: max-age=31536000; includeSubDomains";
      more_set_headers "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.platform.com;";
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - platform.com
    - www.platform.com
    secretName: frontend-tls
  rules:
  - host: platform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
  - host: www.platform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

## Database Deployment

### 1. MySQL Database Deployment

#### StatefulSet for MySQL
```yaml
# k8s/database/mysql-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql-core
  namespace: platform-core
  labels:
    app: mysql
    tier: database
    role: core
spec:
  serviceName: mysql-core
  replicas: 1
  selector:
    matchLabels:
      app: mysql
      role: core
  template:
    metadata:
      labels:
        app: mysql
        tier: database
        role: core
    spec:
      securityContext:
        runAsUser: 999
        fsGroup: 999
      initContainers:
      - name: init-mysql
        image: busybox:1.35
        command:
        - sh
        - -c
        - |
          set -ex
          # Generate mysql server-id from pod ordinal index.
          [[ `hostname` =~ -([0-9]+)$ ]] || exit 1
          ordinal=${BASH_REMATCH[1]}
          echo [mysqld] > /mnt/conf.d/server-id.cnf
          # Add an offset to avoid reserved server-id=0 value.
          echo server-id=$((100 + $ordinal)) >> /mnt/conf.d/server-id.cnf
          # Copy appropriate conf.d files from config-map to emptyDir.
          if [[ $ordinal -eq 0 ]]; then
            cp /mnt/config-map/primary.cnf /mnt/conf.d/
          else
            cp /mnt/config-map/replica.cnf /mnt/conf.d/
          fi
        volumeMounts:
        - name: conf
          mountPath: /mnt/conf.d
        - name: config-map
          mountPath: /mnt/config-map
      - name: clone-mysql
        image: gcr.io/google-samples/xtrabackup:1.0
        command:
        - bash
        - -c
        - |
          set -ex
          # Skip the clone if data already exists.
          [[ -d /var/lib/mysql/mysql ]] && exit 0
          # Skip the clone on primary (ordinal index 0).
          [[ `hostname` =~ -([0-9]+)$ ]] || exit 1
          ordinal=${BASH_REMATCH[1]}
          [[ $ordinal -eq 0 ]] && exit 0
          # Clone data from previous peer.
          ncat --recv-only mysql-primary-$(($ordinal-1)).mysql 3307 | xbstream -x -C /var/lib/mysql
          # Prepare the backup.
          xtrabackup --prepare --target-dir=/var/lib/mysql
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
        - name: conf
          mountPath: /etc/mysql/conf.d
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ALLOW_EMPTY_PASSWORD
          value: "1"
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: password
        ports:
        - name: mysql
          containerPort: 3306
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
        - name: conf
          mountPath: /etc/mysql/conf.d
        - name: logs
          mountPath: /var/log/mysql
        livenessProbe:
          exec:
            command:
            - mysqladmin
            - ping
            - -h
            - localhost
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          exec:
            command:
            - mysql
            - -h
            - localhost
            - -e
            - "SELECT 1"
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        resources:
          requests:
            cpu: 250m
            memory: 1Gi
          limits:
            cpu: 500m
            memory: 2Gi
      - name: xtrabackup
        image: gcr.io/google-samples/xtrabackup:1.0
        ports:
        - name: xtrabackup
          containerPort: 3307
        command:
        - bash
        - -c
        - |
          set -ex
          cd /var/lib/mysql

          # Determine binlog position of cloned data, if any.
          if [[ -f xtrabackup_slave_info && "x$(<xtrabackup_slave_info)" != "x" ]]; then
            # We are cloning an existing replica, so skip the reset.
            cat xtrabackup_slave_info
            # In this case, we want to "catch up" to the primary using the gtid.
            # The data is already in a consistent state, but we need to update
            # the rpl_slave_state to reflect the current gtid position.
            # This is a known issue with xtrabackup version 2.4.9.
            sed -i 's/.*;//g' xtrabackup_slave_info
          else
            # If starting a fresh replica, reset the master info.
            rm -f xtrabackup_binlog_info
            rm -f xtrabackup_slave_info
            echo "RESET MASTER ALL" > reset.sql
          fi

          # Start mysql server for backup and restore.
          mysqld --daemonize --pid-file=/var/run/mysqld/mysqld.pid

          # Run reset script if needed.
          if [[ -f reset.sql ]]; then
            mysql -uroot < reset.sql
          fi

          # Start backup server listening on port 3307.
          exec ncat --listen --keep-open --send-only --max-conns=1 3307 -c "
            xtrabackup --backup --slave-info --stream=xbstream --host=127.0.0.1 --user=root
          "
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
        - name: conf
          mountPath: /etc/mysql/conf.d
      volumes:
      - name: conf
        emptyDir: {}
      - name: config-map
        configMap:
          name: mysql-config
      - name: logs
        emptyDir: {}
  volumeClaimTemplates:
  - metadata:
      name: data
      labels:
        app: mysql
        role: core
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "ssd-storage"
      resources:
        requests:
          storage: 100Gi

---
apiVersion: v1
kind: Service
metadata:
  name: mysql-core
  namespace: platform-core
  labels:
    app: mysql
    role: core
spec:
  ports:
  - name: mysql
    port: 3306
    targetPort: 3306
  clusterIP: None
  selector:
    app: mysql
    role: core

---
apiVersion: v1
kind: Service
metadata:
  name: mysql-primary
  namespace: platform-core
  labels:
    app: mysql
    role: primary
spec:
  ports:
  - name: mysql
    port: 3306
    targetPort: 3306
  selector:
    app: mysql
    role: core
```

### 2. Redis Cache Deployment

#### Redis Cluster
```yaml
# k8s/database/redis-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: platform-core
  labels:
    app: redis
    role: cache
spec:
  serviceName: redis-cluster
  replicas: 6
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
        role: cache
    spec:
      securityContext:
        runAsUser: 999
        fsGroup: 999
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - /etc/redis/redis.conf
        - --cluster-enabled
        - "yes"
        - --cluster-config-file
        - nodes.conf
        - --cluster-node-timeout
        - "5000"
        - --appendonly
        - "yes"
        - --protected-mode
        - "no"
        ports:
        - containerPort: 6379
          name: client
        - containerPort: 16379
          name: gossip
        volumeMounts:
        - name: conf
          mountPath: /etc/redis
        - name: data
          mountPath: /data
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
      volumes:
      - name: conf
        configMap:
          name: redis-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "ssd-storage"
      resources:
        requests:
          storage: 10Gi

---
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster
  namespace: platform-core
  labels:
    app: redis
spec:
  ports:
  - name: client
    port: 6379
    targetPort: 6379
  - name: gossip
    port: 16379
    targetPort: 16379
  clusterIP: None
  selector:
    app: redis
```

## Monitoring & Observability

### 1. Prometheus Monitoring Stack

#### Prometheus Configuration
```yaml
# k8s/monitoring/prometheus.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: platform-monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    rule_files:
      - "/etc/prometheus/rules/*.yml"

    alerting:
      alertmanagers:
        - static_configs:
            - targets:
              - alertmanager:9093

    scrape_configs:
      # Kubernetes API Server
      - job_name: 'kubernetes-apiservers'
        kubernetes_sd_configs:
          - role: endpoints
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
        relabel_configs:
          - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
            action: keep
            regex: default;kubernetes;https

      # Node Exporter
      - job_name: 'kubernetes-nodes'
        kubernetes_sd_configs:
          - role: node
        relabel_configs:
          - action: labelmap
            regex: __meta_kubernetes_node_label_(.+)
          - target_label: __address__
            replacement: kubernetes.default.svc:443
          - source_labels: [__meta_kubernetes_node_name]
            regex: (.+)
            target_label: __metrics_path__
            replacement: /api/v1/nodes/${1}/proxy/metrics

      # Kubelet
      - job_name: 'kubernetes-kubelet'
        kubernetes_sd_configs:
          - role: node
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
        relabel_configs:
          - action: labelmap
            regex: __meta_kubernetes_node_label_(.+)
          - target_label: __address__
            replacement: kubernetes.default.svc:443
          - source_labels: [__meta_kubernetes_node_name]
            regex: (.+)
            target_label: __metrics_path__
            replacement: /api/v1/nodes/${1}/proxy/metrics

      # Platform Services
      - job_name: 'platform-services'
        kubernetes_sd_configs:
          - role: endpoints
          - namespaces:
              names:
                - platform-core
                - platform-apps
        relabel_configs:
          - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
          - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
            action: replace
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:$2
            target_label: __address__
          - action: labelmap
            regex: __meta_kubernetes_service_label_(.+)
          - source_labels: [__meta_kubernetes_namespace]
            action: replace
            target_label: kubernetes_namespace
          - source_labels: [__meta_kubernetes_service_name]
            action: replace
            target_label: kubernetes_name

      # MySQL Exporter
      - job_name: 'mysql'
        kubernetes_sd_configs:
          - role: endpoints
        relabel_configs:
          - source_labels: [__meta_kubernetes_service_name]
            action: keep
            regex: mysql-.*
          - source_labels: [__address__]
            action: replace
            target_label: __address__
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:9104

      # Redis Exporter
      - job_name: 'redis'
        kubernetes_sd_configs:
          - role: endpoints
        relabel_configs:
          - source_labels: [__meta_kubernetes_service_name]
            action: keep
            regex: redis-.*
          - source_labels: [__address__]
            action: replace
            target_label: __address__
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:9121

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: platform-monitoring
  labels:
    app: prometheus
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      serviceAccountName: prometheus
      securityContext:
        runAsUser: 65534
        runAsGroup: 65534
        fsGroup: 65534
      containers:
      - name: prometheus
        image: prom/prometheus:v2.40.0
        args:
          - '--config.file=/etc/prometheus/prometheus.yml'
          - '--storage.tsdb.path=/prometheus/'
          - '--web.console.libraries=/etc/prometheus/console_libraries'
          - '--web.console.templates=/etc/prometheus/consoles'
          - '--storage.tsdb.retention.time=15d'
          - '--web.enable-lifecycle'
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config-volume
          mountPath: /etc/prometheus
        - name: storage-volume
          mountPath: /prometheus/
        resources:
          requests:
            cpu: 200m
            memory: 1000Mi
          limits:
            cpu: 1000m
            memory: 2000Mi
      volumes:
      - name: config-volume
        configMap:
          name: prometheus-config
      - name: storage-volume
        persistentVolumeClaim:
          claimName: prometheus-pvc
      nodeSelector:
        node-type: monitoring

---
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  namespace: platform-monitoring
  labels:
    app: prometheus
spec:
  type: ClusterIP
  ports:
  - port: 9090
    targetPort: 9090
    name: http
  selector:
    app: prometheus
```

### 2. Grafana Dashboard

#### Grafana Deployment
```yaml
# k8s/monitoring/grafana.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: platform-monitoring
  labels:
    app: grafana
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      securityContext:
        runAsUser: 472
        runAsGroup: 472
        fsGroup: 472
      containers:
      - name: grafana
        image: grafana/grafana:9.3.0
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: grafana-secrets
              key: admin-password
        - name: GF_INSTALL_PLUGINS
          value: "grafana-piechart-panel,grafana-worldmap-panel"
        - name: GF_SERVER_DOMAIN
          value: "grafana.platform.com"
        - name: GF_SERVER_ROOT_URL
          value: "https://grafana.platform.com"
        ports:
        - containerPort: 3000
          name: http
        volumeMounts:
        - name: grafana-storage
          mountPath: /var/lib/grafana
        - name: grafana-config
          mountPath: /etc/grafana/provisioning
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
      volumes:
      - name: grafana-storage
        persistentVolumeClaim:
          claimName: grafana-pvc
      - name: grafana-config
        configMap:
          name: grafana-config

---
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: platform-monitoring
  labels:
    app: grafana
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: 3000
    name: http
  selector:
    app: grafana

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana
  namespace: platform-monitoring
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - grafana.platform.com
    secretName: grafana-tls
  rules:
  - host: grafana.platform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 3000
```

## CI/CD Pipeline

### 1. GitHub Actions Workflow

#### CI Pipeline
```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: platform

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [backend, frontend, auth-service, tenant-service, service-registry]

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: ${{ matrix.service }}/package-lock.json

    - name: Install dependencies
      run: |
        cd ${{ matrix.service }}
        npm ci

    - name: Run linting
      run: |
        cd ${{ matrix.service }}
        npm run lint

    - name: Run type checking
      run: |
        cd ${{ matrix.service }}
        npm run type-check

    - name: Run unit tests
      run: |
        cd ${{ matrix.service }}
        npm run test:unit

    - name: Run integration tests
      run: |
        cd ${{ matrix.service }}
        npm run test:integration

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        directory: ${{ matrix.service }}/coverage
        flags: ${{ matrix.service }}

  security-scan:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

    - name: Run npm audit
      run: npm audit --audit-level=high

  build-and-push:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    strategy:
      matrix:
        service: [backend, frontend, auth-service, tenant-service, service-registry]

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ github.repository }}/${{ matrix.service }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: ./${{ matrix.service }}
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        platforms: linux/amd64,linux/arm64

  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Deploy to staging
      run: |
        export KUBECONFIG=kubeconfig
        kubectl set image deployment/api-gateway api-gateway=${{ env.REGISTRY }}/${{ github.repository }}/backend:${{ github.sha }} -n platform-staging
        kubectl set image deployment/frontend frontend=${{ env.REGISTRY }}/${{ github.repository }}/frontend:${{ github.sha }} -n platform-staging
        kubectl rollout status deployment/api-gateway -n platform-staging
        kubectl rollout status deployment/frontend -n platform-staging

    - name: Run smoke tests
      run: |
        npm run test:smoke -- --env=staging

  deploy-production:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG_PRODUCTION }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Deploy to production
      run: |
        export KUBECONFIG=kubeconfig
        # Blue-green deployment strategy
        kubectl apply -f k8s/services/
        kubectl patch deployment api-gateway -p '{"spec":{"template":{"spec":{"containers":[{"name":"api-gateway","image":"'${{ env.REGISTRY }}/${{ github.repository }}/backend:${{ github.sha }}'"}]}}}}' -n platform-core
        kubectl patch deployment frontend -p '{"spec":{"template":{"spec":{"containers":[{"name":"frontend","image":"'${{ env.REGISTRY }}/${{ github.repository }}/frontend:${{ github.sha }}'"}]}}}}' -n platform-apps
        kubectl rollout status deployment/api-gateway -n platform-core
        kubectl rollout status deployment/frontend -n platform-apps

    - name: Run health checks
      run: |
        npm run test:health -- --env=production

    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 2. Helm Charts

#### Application Helm Chart
```yaml
# helm/platform/Chart.yaml
apiVersion: v2
name: platform
description: Multi-Tenant Service Management Platform
type: application
version: 1.0.0
appVersion: "1.0.0"

dependencies:
  - name: redis
    version: "17.3.7"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
  - name: mysql
    version: "9.8.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: mysql.enabled
  - name: ingress-nginx
    version: "4.4.0"
    repository: "https://kubernetes.github.io/ingress-nginx"
    condition: ingress-nginx.enabled

---
# helm/platform/values.yaml
global:
  imageRegistry: ghcr.io
  imagePullSecrets:
    - name: registry-credentials
  storageClass: "ssd-storage"

replicaCount:
  apiGateway: 3
  frontend: 3
  authService: 2
  tenantService: 2
  serviceRegistry: 2

image:
  repository: platform
  pullPolicy: IfNotPresent
  tag: "1.0.0"

service:
  type: ClusterIP
  ports:
    http: 80

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: platform.com
      paths:
        - path: /
          pathType: Prefix
    - host: api.platform.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: platform-tls
      hosts:
        - platform.com
        - api.platform.com

resources:
  apiGateway:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 100m
      memory: 256Mi
  frontend:
    limits:
      cpu: 200m
      memory: 256Mi
    requests:
      cpu: 50m
      memory: 128Mi
  authService:
    limits:
      cpu: 300m
      memory: 256Mi
    requests:
      cpu: 100m
      memory: 128Mi
  tenantService:
    limits:
      cpu: 300m
      memory: 256Mi
    requests:
      cpu: 100m
      memory: 128Mi
  serviceRegistry:
    limits:
      cpu: 300m
      memory: 256Mi
    requests:
      cpu: 100m
      memory: 128Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: platform-monitoring

redis:
  enabled: true
  auth:
    enabled: true
    existingSecret: platform-secrets
    existingSecretPasswordKey: redis-password
  master:
    persistence:
      enabled: true
      size: 8Gi
    resources:
      limits:
        cpu: 500m
        memory: 512Mi
      requests:
        cpu: 100m
        memory: 128Mi
  replica:
    replicaCount: 2
    persistence:
      enabled: true
      size: 8Gi

mysql:
  enabled: true
  auth:
    existingSecret: platform-secrets
    secretKeys:
      rootPassword: mysql-root-password
      userPassword: mysql-password
  primary:
    persistence:
      enabled: true
      size: 20Gi
    resources:
      limits:
        cpu: 500m
        memory: 1Gi
      requests:
        cpu: 250m
        memory: 512Mi
  secondary:
    replicaCount: 1
    persistence:
      enabled: true
      size: 20Gi

secrets:
  existingSecret: platform-secrets
```

## Environment Management

### 1. Environment Configurations

#### Development Environment
```yaml
# helm/values-dev.yaml
global:
  environment: development

replicaCount:
  apiGateway: 1
  frontend: 1
  authService: 1
  tenantService: 1
  serviceRegistry: 1

resources:
  apiGateway:
    limits:
      cpu: 200m
      memory: 256Mi
    requests:
      cpu: 50m
      memory: 128Mi

ingress:
  hosts:
    - host: dev.platform.com
      paths:
        - path: /
          pathType: Prefix
    - host: api-dev.platform.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: platform-dev-tls
      hosts:
        - dev.platform.com
        - api-dev.platform.com

autoscaling:
  enabled: false

redis:
  master:
    persistence:
      size: 4Gi
  replica:
    replicaCount: 0

mysql:
  primary:
    persistence:
      size: 10Gi
  secondary:
    replicaCount: 0
```

#### Production Environment
```yaml
# helm/values-prod.yaml
global:
  environment: production

replicaCount:
  apiGateway: 5
  frontend: 5
  authService: 3
  tenantService: 3
  serviceRegistry: 3

resources:
  apiGateway:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 200m
      memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20

redis:
  master:
    resources:
      limits:
        cpu: 1000m
        memory: 1Gi
      requests:
        cpu: 250m
        memory: 512Mi
  replica:
    replicaCount: 3

mysql:
  primary:
    persistence:
      size: 100Gi
    resources:
      limits:
        cpu: 2000m
        memory: 4Gi
      requests:
        cpu: 500m
        memory: 1Gi
  secondary:
    replicaCount: 2
    persistence:
      size: 100Gi
```

### 2. Deployment Scripts

#### Deploy Script
```bash
#!/bin/bash
# scripts/deploy.sh

set -e

# Configuration
ENVIRONMENT=${1:-staging}
NAMESPACE=${2:-platform-$ENVIRONMENT}
CHART_PATH="./helm/platform"
VALUES_PATH="./helm/values-$ENVIRONMENT.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    exit 1
}

# Check if kubectl is configured
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
    fi

    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
    fi
}

# Check if helm is installed
check_helm() {
    if ! command -v helm &> /dev/null; then
        error "helm is not installed"
    fi
}

# Create namespace if it doesn't exist
create_namespace() {
    log "Creating namespace: $NAMESPACE"
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
}

# Add helm repositories
add_helm_repos() {
    log "Adding Helm repositories"
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
}

# Deploy application
deploy_application() {
    log "Deploying application to $ENVIRONMENT"

    helm upgrade --install platform $CHART_PATH \
        --namespace $NAMESPACE \
        --values $VALUES_PATH \
        --timeout 10m \
        --wait \
        --atomic

    if [ $? -eq 0 ]; then
        log "Deployment completed successfully"
    else
        error "Deployment failed"
    fi
}

# Run health checks
run_health_checks() {
    log "Running health checks"

    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app=api-gateway -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=frontend -n $NAMESPACE --timeout=300s

    # Check application health
    INGRESS_URL=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].spec.rules[0].host}')

    if curl -f -s "https://$INGRESS_URL/health" > /dev/null; then
        log "Health check passed"
    else
        error "Health check failed"
    fi
}

# Main deployment flow
main() {
    log "Starting deployment to $ENVIRONMENT"

    check_kubectl
    check_helm
    add_helm_repos
    create_namespace
    deploy_application
    run_health_checks

    log "Deployment to $ENVIRONMENT completed successfully"
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT

# Run main function
main "$@"
```

---

**Document Version**: 1.0
**Last Updated**: 30 Oktober 2025
**Next Document**: [07-Implementation-Guide.md](./07-implementation-guide.md)