export function FormError({ errors }: { errors: string[] }) {
  if (!errors || errors.length === 0) {
    return null
  }

  return (
    <div className="text-red-600 text-sm mt-1">
      {errors.map((error, index) => (
        <div key={index}>{error}</div>
      ))}
    </div>
  )
}