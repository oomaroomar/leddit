import {
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Textarea,
  InputProps,
  ComponentWithAs,
  TextareaProps,
} from '@chakra-ui/react'
import { useField } from 'formik'
import React, { InputHTMLAttributes } from 'react'

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string
  label: string
  textarea?: boolean
}

export const InputField: React.FC<InputFieldProps> = ({
  size: _,
  textarea,
  label,
  ...props
}) => {
  const C: any = textarea ? Textarea : Input

  const [field, { error }] = useField(props)
  return (
    <FormControl isInvalid={!!error}>
      <FormLabel htmlFor={field.name}>{label}</FormLabel>
      <C
        {...field}
        {...props}
        id={field.name}
        placeholder={props.placeholder}
      />

      {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
    </FormControl>
  )
}
