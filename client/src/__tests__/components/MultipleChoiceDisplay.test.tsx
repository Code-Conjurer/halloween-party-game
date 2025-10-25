import { describe, test, expect, jest } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { MultipleChoiceDisplay } from '../../components/MultipleChoiceDisplay'

const mockOptions = [
  { id: 'a', text: 'Option A', value: 'a' },
  { id: 'b', text: 'Option B', value: 'b' },
  { id: 'c', text: 'Option C', value: 'c' },
]

describe('MultipleChoiceDisplay', () => {
  test('should render content and options', () => {
    render(
      <MultipleChoiceDisplay
        content="Choose one:"
        options={mockOptions}
      />
    )

    expect(screen.getByText('Choose one:')).toBeInTheDocument()
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
    expect(screen.getByText('Option C')).toBeInTheDocument()
  })

  test('should render radio buttons for single choice', () => {
    render(
      <MultipleChoiceDisplay
        content="Choose one:"
        options={mockOptions}
        allowMultiple={false}
      />
    )

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
  })

  test('should render checkboxes for multiple choice', () => {
    render(
      <MultipleChoiceDisplay
        content="Choose multiple:"
        options={mockOptions}
        allowMultiple={true}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(3)
  })

  test('should submit single selection', () => {
    const onSubmit = jest.fn()
    render(
      <MultipleChoiceDisplay
        content="Choose one:"
        options={mockOptions}
        allowMultiple={false}
        onSubmit={onSubmit}
      />
    )

    const optionB = screen.getByLabelText('Option B')
    const submitButton = screen.getByText('Submit')

    fireEvent.click(optionB)
    fireEvent.click(submitButton)

    expect(onSubmit).toHaveBeenCalledWith('b')
  })

  test('should submit multiple selections as array', () => {
    const onSubmit = jest.fn()
    render(
      <MultipleChoiceDisplay
        content="Choose multiple:"
        options={mockOptions}
        allowMultiple={true}
        onSubmit={onSubmit}
      />
    )

    const optionA = screen.getByLabelText('Option A')
    const optionC = screen.getByLabelText('Option C')
    const submitButton = screen.getByText('Submit')

    fireEvent.click(optionA)
    fireEvent.click(optionC)
    fireEvent.click(submitButton)

    expect(onSubmit).toHaveBeenCalledWith(expect.arrayContaining(['a', 'c']))
  })

  test('should allow toggling checkboxes', () => {
    const onSubmit = jest.fn()
    render(
      <MultipleChoiceDisplay
        content="Choose multiple:"
        options={mockOptions}
        allowMultiple={true}
        onSubmit={onSubmit}
      />
    )

    const optionA = screen.getByLabelText('Option A') as HTMLInputElement
    const submitButton = screen.getByText('Submit')

    // Check
    fireEvent.click(optionA)
    expect(optionA.checked).toBe(true)

    // Uncheck
    fireEvent.click(optionA)
    expect(optionA.checked).toBe(false)

    // Submit should not be called if no options selected
    fireEvent.click(submitButton)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('should disable submit button when no selection', () => {
    render(
      <MultipleChoiceDisplay
        content="Choose one:"
        options={mockOptions}
      />
    )

    const submitButton = screen.getByText('Submit') as HTMLButtonElement

    expect(submitButton.disabled).toBe(true)
  })

  test('should enable submit button when option selected', () => {
    render(
      <MultipleChoiceDisplay
        content="Choose one:"
        options={mockOptions}
      />
    )

    const optionA = screen.getByLabelText('Option A')
    const submitButton = screen.getByText('Submit') as HTMLButtonElement

    fireEvent.click(optionA)

    expect(submitButton.disabled).toBe(false)
  })

  test('should disable all inputs when disabled prop is true', () => {
    render(
      <MultipleChoiceDisplay
        content="Choose one:"
        options={mockOptions}
        disabled={true}
      />
    )

    const radios = screen.getAllByRole('radio')
    const submitButton = screen.getByText('Submit')

    radios.forEach((radio) => {
      expect(radio).toBeDisabled()
    })
    expect(submitButton).toBeDisabled()
  })

  test('should not submit when disabled', () => {
    const onSubmit = jest.fn()
    render(
      <MultipleChoiceDisplay
        content="Choose one:"
        options={mockOptions}
        onSubmit={onSubmit}
        disabled={true}
      />
    )

    const submitButton = screen.getByText('Submit')
    fireEvent.click(submitButton)

    expect(onSubmit).not.toHaveBeenCalled()
  })
})
