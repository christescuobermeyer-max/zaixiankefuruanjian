import { afterEach, describe, expect, it } from "vitest";
import { clearLoginPreferences, loadLoginPreferences, saveLoginPreferences } from "./authPreferences";

describe("authPreferences", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("defaults remember-password and auto-login to enabled", () => {
    expect(loadLoginPreferences()).toEqual({
      email: "",
      password: "",
      rememberPassword: true,
      autoLogin: true
    });
  });

  it("saves remembered credentials for future auto-login", () => {
    saveLoginPreferences({
      email: "admin@example.com",
      password: "demo-password",
      rememberPassword: true,
      autoLogin: true
    });

    expect(loadLoginPreferences()).toEqual({
      email: "admin@example.com",
      password: "demo-password",
      rememberPassword: true,
      autoLogin: true
    });
  });

  it("clears credentials when remember-password is disabled", () => {
    saveLoginPreferences({
      email: "admin@example.com",
      password: "demo-password",
      rememberPassword: true,
      autoLogin: true
    });

    saveLoginPreferences({
      email: "admin@example.com",
      password: "demo-password",
      rememberPassword: false,
      autoLogin: false
    });

    expect(window.localStorage.getItem("zaixiankefu.loginPreferences")).toBeNull();
    expect(loadLoginPreferences()).toEqual({
      email: "",
      password: "",
      rememberPassword: true,
      autoLogin: true
    });
  });

  it("falls back to defaults when stored data is invalid", () => {
    window.localStorage.setItem("zaixiankefu.loginPreferences", "{broken");

    expect(loadLoginPreferences()).toEqual({
      email: "",
      password: "",
      rememberPassword: true,
      autoLogin: true
    });
  });

  it("clears stored login preferences explicitly", () => {
    saveLoginPreferences({
      email: "admin@example.com",
      password: "demo-password",
      rememberPassword: true,
      autoLogin: true
    });

    clearLoginPreferences();

    expect(window.localStorage.getItem("zaixiankefu.loginPreferences")).toBeNull();
  });
});
