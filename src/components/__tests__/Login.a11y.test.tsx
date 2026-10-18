import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { axe } from '../../test/axe';
import Login from '../Login';
import { useAuth } from '../../contexts/AuthContext';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>);

describe('Login a11y', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      currentUser: null,
      isLoading: false,
      signIn: jest.fn(),
      loginWithEmailAndPassword: jest.fn(),
      registerWithEmailAndPassword: jest.fn(),
      sendPasswordReset: jest.fn(),
    });
  });

  test('初期表示（ログインタブ）でアクセシビリティ違反がない', async () => {
    const { container } = renderWithTheme(<Login />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
