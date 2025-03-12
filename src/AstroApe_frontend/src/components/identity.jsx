import { useSiweIdentity } from "ic-use-siwe-identity";

export default function Identity() {
  const siwe = useSiweIdentity();

  console.log("SIWE Hook Output:", siwe); // Debugging

  if (!siwe || !siwe.identity) return <div className="text-white">Not signed in</div>;

  return <div className="text-white">{siwe.identity.getPrincipal().toString()}</div>;
}
