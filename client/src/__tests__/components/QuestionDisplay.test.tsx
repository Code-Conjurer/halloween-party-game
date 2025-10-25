import { describe, test, expect, jest } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuestionDisplay } from '../../components/QuestionDisplay'

describe('QuestionDisplay', () => {
  test('should render question text', () => {
    render(<QuestionDisplay text="What is your name?" />)

    expect(screen.getByText('What is your name?')).toBeInTheDocument()
  })

  test('should render input with placeholder', () => {
    render(
      <QuestionDisplay
        text="Enter your answer"
        placeholder="Type here..."
      />
    )

    const input = screen.getByPlaceholderText('Type here...')
    expect(input).toBeInTheDocument()
  })

  test('should call onInput when form is submitted', () => {
    const onInput = jest.fn()
    render(
      <QuestionDisplay
        text="What is your name?"
        onInput={onInput}
      />
    )

    const input = screen.getByRole('textbox')
    const submitButton = screen.getByText('Submit')

    fireEvent.change(input, { target: { value: 'Alice' } })
    fireEvent.click(submitButton)

    expect(onInput).toHaveBeenCalledWith('Alice')
  })

  test('should clear input after submission', () => {
    const onInput = jest.fn()
    render(<QuestionDisplay text="Question?" onInput={onInput} />)

    const input = screen.getByRole('textbox') as HTMLInputElement
    const submitButton = screen.getByText('Submit')

    fireEvent.change(input, { target: { value: 'Answer' } })
    fireEvent.click(submitButton)

    expect(input.value).toBe('')
  })

  test('should disable input and button when disabled prop is true', () => {
    render(
      <QuestionDisplay
        text="Question?"
        disabled={true}
      />
    )

    const input = screen.getByRole('textbox')
    const submitButton = screen.getByText('Submit')

    expect(input).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })

  test('should not call onInput when disabled', () => {
    const onInput = jest.fn()
    render(
      <QuestionDisplay
        text="Question?"
        onInput={onInput}
        disabled={true}
      />
    )

    const input = screen.getByRole('textbox')
    const submitButton = screen.getByText('Submit')

    fireEvent.change(input, { target: { value: 'Answer' } })
    fireEvent.click(submitButton)

    expect(onInput).not.toHaveBeenCalled()
  })

  test('should handle form submission with Enter key', () => {
    const onInput = jest.fn()
    render(<QuestionDisplay text="Question?" onInput={onInput} />)

    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'Answer' } })
    fireEvent.submit(input.closest('form')!)

    expect(onInput).toHaveBeenCalledWith('Answer')
  })
})
