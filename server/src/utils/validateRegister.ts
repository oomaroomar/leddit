import { FieldError, UsernamePasswordInput } from 'src/resolvers/user'

export const validateRegister = (
  options: UsernamePasswordInput
): FieldError[] | null => {
  const errors: FieldError[] = []

  if (options.username.includes('@')) {
    errors.push({
      field: 'username',
      message: 'username can not contain the @ symbol',
    })
  }

  if (options.username.length <= 2)
    errors.push({
      field: 'username',
      message: 'username must be 2 characters or longer',
    })

  if (!options.email.includes('@')) {
    errors.push({
      field: 'email',
      message: 'invalid email',
    })
  }

  if (options.password.length < 3)
    errors.push({
      field: 'password',
      message: 'password must be 3 characters or longer',
    })

  return errors.length > 0 ? errors : null
}
