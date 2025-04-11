import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useSiweIdentity } from "ic-use-siwe-identity";
import Button from "./Button"; // Your custom button component

export default function LoginButton() {
  const { isConnected } = useAccount();
  const { login, loginStatus, identity } = useSiweIdentity();

  // Auto-login when connected
  useEffect(() => {
    if (isConnected && !identity && loginStatus !== "logging-in") {
      login();
    }
  }, [isConnected, identity, loginStatus, login]);

  // 🧠 Extract first segment of principal
  const getShortPrincipal = () => {
    try {
      const principal = identity?.getPrincipal().toString();
      return principal?.split("-").slice(0, 2).join("-"); // e.g. "dnd36-auewv"
    } catch (error) {
      return "";
    }
  };

  // ✅ If signed in, just show the short principal
  if (identity) {
    return (
      <Button>
        {getShortPrincipal()}
      </Button>
    );
  }

  // 🔐 If not signed in, show the sign-in button
  return (
    <Button white
      onClick={() => void login()}
      disabled={loginStatus === "logging-in" || !isConnected}
      className={`
        ${loginStatus === "logging-in" ? "cursor-wait" : ""}
        ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      {loginStatus === "logging-in" ? "Authenticating..." : "Sign in with Ethereum"}
    </Button>
  );
}
