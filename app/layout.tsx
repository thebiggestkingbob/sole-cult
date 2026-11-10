import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'SOLE CULT — For the Obsessed',description:'Discover the SOLE CULT sneaker collection.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
