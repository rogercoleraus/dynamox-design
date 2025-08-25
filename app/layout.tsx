export const metadata = {
  title: 'DMA',
  description: 'DMA mock with MUI + DataGrid'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
