import { backdropFor, coverFor } from '../lib/environments.js'

export default function EnvironmentArt({
  envId = 'nature',
  customImage = null,
  variant = 'backdrop',
  className = '',
}) {
  if (variant === 'cover') {
    return (
      <div
        aria-hidden="true"
        className={`relative overflow-hidden ${className}`.trim()}
        style={{ background: coverFor(envId, customImage) }}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 transition-[background] duration-500 ease-out ${className}`.trim()}
      style={{ background: backdropFor(envId, customImage) }}
    />
  )
}
