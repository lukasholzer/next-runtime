import os from 'os'
import path from 'path'

import { unlink, existsSync, readFileSync, ensureDir } from 'fs-extra'
import { join } from 'pathe'

import {
  normalizeRoute,
  unlocalizeRoute,
  localizeRoute,
  localizeDataRoute,
  downloadFile,
} from '../../packages/runtime/src/templates/handlerUtils'

describe('normalizeRoute', () => {
  it('removes a trailing slash from a route', () => {
    expect(normalizeRoute('/foo/')).toEqual('/foo')
  })
  it('ignores a string without a trailing slash', () => {
    expect(normalizeRoute('/foo')).toEqual('/foo')
  })
  it('does not remove a lone slash', () => {
    expect(normalizeRoute('/')).toEqual('/')
  })
})

describe('unlocalizeRoute', () => {
  it('removes the locale prefix from an i18n route', () => {
    expect(
      unlocalizeRoute('/fr/foo', {
        defaultLocale: 'en',
        locales: ['en', 'fr', 'de'],
      }),
    ).toEqual('/foo')
  })
  it('removes the locale prefix from a root i18n route', () => {
    expect(
      unlocalizeRoute('/de', {
        defaultLocale: 'en',
        locales: ['en', 'fr', 'de'],
      }),
    ).toEqual('/')
  })
  it('does not modify a default locale route', () => {
    expect(
      unlocalizeRoute('/foo', {
        defaultLocale: 'en',
        locales: ['en', 'fr', 'de'],
      }),
    ).toEqual('/foo')
  })
})

describe('localizeRoute', () => {
  it('adds the locale prefix to an i18n route', () => {
    expect(
      localizeRoute('/foo', {
        defaultLocale: 'en',
        locales: ['en', 'fr', 'de'],
      }),
    ).toEqual('/en/foo')
  })
  it('adds the locale prefix to a root i18n route', () => {
    expect(
      localizeRoute('/', {
        defaultLocale: 'en',
        locales: ['en', 'fr', 'de'],
      }),
    ).toEqual('/en')
  })
  it('does not modify a prefixed i18n route', () => {
    expect(
      localizeRoute('/en/foo', {
        defaultLocale: 'en',
        locales: ['en', 'fr', 'de'],
      }),
    ).toEqual('/en/foo')
  })
})

describe('localizeDataRoute', () => {
  it('adds the locale prefix to a data route', () => {
    expect(localizeDataRoute('/_next/data/build/foo.json', '/en/foo')).toEqual('/_next/data/build/en/foo.json')
  })
  it('removes the index suffix from a root route', () => {
    expect(localizeDataRoute('/_next/data/build/index.json', '/en')).toEqual('/_next/data/build/en.json')
  })
  it('does not add the locale prefix if it already exists in the data route', () => {
    expect(localizeDataRoute('/_next/data/build/en/foo.json', '/en/foo')).toEqual('/_next/data/build/en/foo.json')
  })
  it('does not modify an RSC data route', () => {
    expect(localizeDataRoute('/foo.rsc', '/foo')).toEqual('/foo.rsc')
  })
})

describe('downloadFile', () => {
  it('can download a file', async () => {
    const url =
      'https://raw.githubusercontent.com/netlify/next-runtime/c2668af24a78eb69b33222913f44c1900a3bce23/manifest.yml'
    const tmpFile = join(os.tmpdir(), 'next-test', 'downloadfile.txt')
    await ensureDir(path.dirname(tmpFile))
    await downloadFile(url, tmpFile)
    expect(existsSync(tmpFile)).toBeTruthy()
    expect(readFileSync(tmpFile, 'utf8')).toMatchInlineSnapshot(`
      "name: netlify-plugin-nextjs-experimental
      "
    `)
    await unlink(tmpFile)
  })

  it('throws on bad domain', async () => {
    const url = 'https://nonexistentdomain.example'
    const tmpFile = join(os.tmpdir(), 'next-test', 'downloadfile.txt')
    await ensureDir(path.dirname(tmpFile))
    await expect(downloadFile(url, tmpFile)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"getaddrinfo ENOTFOUND nonexistentdomain.example"`,
    )
  })

  it('throws on 404', async () => {
    const url = 'https://example.com/nonexistentfile'
    const tmpFile = join(os.tmpdir(), 'next-test', 'downloadfile.txt')
    await ensureDir(path.dirname(tmpFile))
    await expect(downloadFile(url, tmpFile)).rejects.toThrow(
      'Failed to download https://example.com/nonexistentfile: 404 Not Found',
    )
  })
})
