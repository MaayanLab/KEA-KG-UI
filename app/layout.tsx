import { Metadata } from 'next'
import ThemeRegistry from './ThemeRegistry'
import './global.css'
import { fetch_kg_schema } from '@/utils/initialize'
import React from 'react'
import Head from 'next/head'

export async function generateMetadata(): Promise<Metadata> {
 
  // fetch data
  const {header} = await fetch_kg_schema()
  // optionally access and extend (rather than replace) parent metadata
  const metadata: Metadata = {
    title: header.icon.faviconTitle || header.title,
    description: 'Search for subnetworks within the KEA-KG GRN by entering one or two kinases or kinase phosphosites. The background GRN contains 42,322 kinase-phosphorylation relationships between 466 unique human kinases and 20,192 kinase phosphosites.',
    icons: {
      icon: header.icon.favicon
    },
    }
  return metadata
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const schema = await fetch_kg_schema()
  return (
    <html lang="en">
        <body>
          <ThemeRegistry options={{ key: 'mui' }} theme={schema.ui_theme || "cfde_theme"}>
            {children}
          </ThemeRegistry>
        </body>
    </html>
  )
}
