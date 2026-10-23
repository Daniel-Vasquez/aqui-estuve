/** "14 de julio de 2025" */
export const formatPhotoDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { dateStyle: 'long' });

/** "1086 × 1448 px" */
export const formatDimensions = (width: number, height: number) => `${width} × ${height} px`;
