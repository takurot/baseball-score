import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingButton from '../LoadingButton';

describe('LoadingButton', () => {
  test('renders children when not loading', () => {
    render(<LoadingButton loading={false}>Click me</LoadingButton>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  test('shows loading text when loading prop is true', () => {
    render(
      <LoadingButton loading={true} loadingText="Loading...">
        Click me
      </LoadingButton>
    );
    expect(screen.getByRole('button')).toHaveTextContent('Loading...');
  });

  test('shows default loading text when loading and no loadingText provided', () => {
    render(<LoadingButton loading={true}>Click me</LoadingButton>);
    expect(screen.getByRole('button')).toHaveTextContent('処理中...');
  });

  test('disables button when loading', () => {
    render(<LoadingButton loading={true}>Click me</LoadingButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('disables button when disabled prop is true', () => {
    render(
      <LoadingButton loading={false} disabled={true}>
        Click me
      </LoadingButton>
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('disables button when both loading and disabled are true', () => {
    render(
      <LoadingButton loading={true} disabled={true}>
        Click me
      </LoadingButton>
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('sets aria-busy attribute when loading', () => {
    render(<LoadingButton loading={true}>Click me</LoadingButton>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  test('sets aria-busy attribute to false when not loading', () => {
    render(<LoadingButton loading={false}>Click me</LoadingButton>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false');
  });

  test('has aria-live attribute', () => {
    render(<LoadingButton loading={false}>Click me</LoadingButton>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-live', 'polite');
  });

  test('shows CircularProgress when loading', () => {
    const { container } = render(
      <LoadingButton loading={true}>Click me</LoadingButton>
    );
    // CircularProgressはsvgとして描画される
    const circularProgress = container.querySelector(
      '.MuiCircularProgress-root'
    );
    expect(circularProgress).toBeInTheDocument();
  });

  test('does not show CircularProgress when not loading', () => {
    const { container } = render(
      <LoadingButton loading={false}>Click me</LoadingButton>
    );
    const circularProgress = container.querySelector(
      '.MuiCircularProgress-root'
    );
    expect(circularProgress).not.toBeInTheDocument();
  });

  test('passes through additional props', () => {
    render(
      <LoadingButton loading={false} color="primary" variant="contained">
        Click me
      </LoadingButton>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveClass('MuiButton-containedPrimary');
  });

  test('applies custom startIcon when not loading', () => {
    const CustomIcon = () => <span data-testid="custom-icon">Icon</span>;
    render(
      <LoadingButton loading={false} startIcon={<CustomIcon />}>
        Click me
      </LoadingButton>
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  test('replaces startIcon with CircularProgress when loading', () => {
    const CustomIcon = () => <span data-testid="custom-icon">Icon</span>;
    const { container } = render(
      <LoadingButton loading={true} startIcon={<CustomIcon />}>
        Click me
      </LoadingButton>
    );
    expect(screen.queryByTestId('custom-icon')).not.toBeInTheDocument();
    const circularProgress = container.querySelector(
      '.MuiCircularProgress-root'
    );
    expect(circularProgress).toBeInTheDocument();
  });
});
