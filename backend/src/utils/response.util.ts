export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ResponseUtil {
  static success<T>(message: string, data: T): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
    };
  }

  static paginated<T>(
    message: string,
    items: T[],
    page: number,
    limit: number,
    total: number
  ): ApiResponse<PaginatedData<T>> {
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    };
  }

  static error(message: string): ApiResponse {
    return {
      success: false,
      message,
      data: null,
    };
  }
}