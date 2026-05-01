import { describe, expect, test } from "bun:test"
import { resolveLocale, t } from "../src/i18n"

describe("i18n", () => {
  test("defaults to zh-CN when no locale is configured", () => {
    expect(resolveLocale(undefined, {}).locale).toBe("zh-CN")
    expect(resolveLocale(undefined, {}).fallback).toBe(false)
  })

  test("uses VIBEPAPER_LANG when explicit locale is absent", () => {
    expect(resolveLocale(undefined, { VIBEPAPER_LANG: "en-US" }).locale).toBe("en-US")
  })

  test("explicit locale takes precedence over VIBEPAPER_LANG", () => {
    expect(resolveLocale("zh-CN", { VIBEPAPER_LANG: "en-US" }).locale).toBe("zh-CN")
  })

  test("falls back to zh-CN for unsupported locale values", () => {
    const resolved = resolveLocale("fr-FR", {})
    expect(resolved.locale).toBe("zh-CN")
    expect(resolved.requested).toBe("fr-FR")
    expect(resolved.fallback).toBe(true)
  })

  test("interpolates message parameters", () => {
    expect(t("zh-CN", "dashboard.version", { version: "0.1.0" })).toBe("版本：0.1.0")
    expect(t("en-US", "dashboard.version", { version: "0.1.0" })).toBe("Version: 0.1.0")
  })
})
