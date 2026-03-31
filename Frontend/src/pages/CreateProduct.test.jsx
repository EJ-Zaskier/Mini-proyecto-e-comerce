import { render, screen } from '@testing-library/react';
vi.mock('../services/api', () => ({
  __esModule: true,
  default: {
    post: vi.fn()
  }
}));

import CreateProduct from './CreateProduct';

describe('CreateProduct page', () => {
  test('renders main form fields', () => {
    render(<CreateProduct />);

    expect(screen.getByText(/nuevo producto o servicio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripcion/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/precio/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });
});
