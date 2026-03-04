import React from 'react';

/**
 * Amazon-style button with primary (yellow), secondary (gray), and danger variants.
 */
export default function AmazonButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  size = 'md',
  fullWidth = false,
  type = 'button',
  style = {}
}) {
  const classMap = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger'
  };

  const sizeStyle = size === 'sm'
    ? { padding: '4px 10px', fontSize: '12px' }
    : size === 'lg'
      ? { padding: '10px 22px', fontSize: '15px' }
      : {};

  return (
    <button
      type={type}
      className={classMap[variant]}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...sizeStyle,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : undefined,
        justifyContent: fullWidth ? 'center' : undefined,
        ...style
      }}
    >
      {children}
    </button>
  );
}
