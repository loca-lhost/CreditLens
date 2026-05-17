import type { ReactNode, ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  large?: boolean
  children: ReactNode
}

export default function Button({
  variant = 'secondary',
  large = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const cls = [
    styles.btn,
    styles[variant],
    large ? styles.large : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button className={cls} {...props}>
      {children}
    </button>
  )
}
