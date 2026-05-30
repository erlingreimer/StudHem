import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { NewRequestDialog } from '@/features/maintenance/NewRequestDialog';
import { seedDatabase } from '@/services/mock/seed';

vi.mock('@/features/maintenance/photoDownscale', () => ({
  downscaleToBase64Jpeg: async (f: File) => `data:image/jpeg;base64,STUB(${f.name})`,
}));

describe('NewRequestDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    seedDatabase();
    localStorage.setItem('studhem.v1.session', JSON.stringify(
      { id: 'u-res1', username: 'resident', role: 'resident', name: 'R', email: 'r@r.se', status: 'active' },
    ));
  });

  it('submits a request with category, description, and one photo', async () => {
    const onClose = vi.fn();
    renderWithProviders(<NewRequestDialog open onClose={onClose} propertyId="p-101" />);

    await userEvent.click(screen.getByLabelText(/kategori/i));
    await userEvent.click(screen.getByRole('option', { name: /vvs/i }));
    await userEvent.type(screen.getByLabelText(/beskrivning/i), 'Toalett rinner.');

    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [file] } });

    await userEvent.click(screen.getByRole('button', { name: /^skicka$/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('rejects a 4th photo', async () => {
    renderWithProviders(<NewRequestDialog open onClose={() => {}} propertyId="p-101" />);
    const input = screen.getByTestId('photo-input');
    const files = [1, 2, 3, 4].map((i) => new File(['x'], `${i}.png`, { type: 'image/png' }));
    fireEvent.change(input, { target: { files } });
    await waitFor(() => expect(screen.getByText(/max 3 bilder/i)).toBeInTheDocument());
  });
});
