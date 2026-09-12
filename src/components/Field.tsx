type Props = {
  label: string
  name: string
  value?: string
  placeholder?: string
  type?: string
  required?: boolean
  textarea?: boolean
}

export function Field({
  label,
  name,
  value,
  placeholder,
  type = 'text',
  required = false,
  textarea = false,
}: Props) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {required && <span className="text-[var(--color-danger)]"> *</span>}
      </label>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          rows={3}
          defaultValue={value}
          placeholder={placeholder}
          className="input resize-y"
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={value}
          placeholder={placeholder}
          required={required}
          className="input"
        />
      )}
    </div>
  )
}
