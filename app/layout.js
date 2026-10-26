import './globals.css';

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const siteUrl = configuredSiteUrl && !configuredSiteUrl.includes('localhost')
  ? configuredSiteUrl
  : process.env.NODE_ENV === 'development'
    ? configuredSiteUrl || 'http://localhost:3000'
    : 'https://lobolainvitation.co.za';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Lobola Invitation — Editable Digital Templates',
  description: 'Editable digital invitation templates for lobola celebrations.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
