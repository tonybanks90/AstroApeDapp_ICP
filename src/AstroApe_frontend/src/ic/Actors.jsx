/* eslint-disable react-refresh/only-export-components */
import {
  ActorProvider,
  isIdentityExpiredError,
  createActorContext,
  createUseActorHook,
} from "ic-use-actor";
import { canisterId, idlFactory } from "../../../declarations/AstroApe_backend/index.js";
import { useSiwe } from "ic-siwe-js/react";
import toast from "react-hot-toast";
import React from "react";

const actorContext = createActorContext();
export const useActor = createUseActorHook(actorContext);

export default function Actor({ children }) {
  const { identity, clear } = useSiwe();

  const errorToast = (error) => {
    if (error && typeof error === "object" && "message" in error) {
      toast.error(error.message, {
        position: "bottom-right",
      });
    }
  };

  const handleResponseError = (data) => {
    console.error("onResponseError", data.error);
    if (isIdentityExpiredError(data.error)) {
      toast.error("Login expired.", {
        id: "login-expired",
        position: "bottom-right",
      });
      setTimeout(() => {
        clear();
        window.location.reload();
      }, 1000);
      return;
    }
    errorToast(data.error);
  };

  const handleRequest = (data) => {
    console.log("onRequest", data.args, data.methodName);
    return data.args;
  };

  return (
    <ActorProvider
      canisterId={canisterId}
      context={actorContext}
      identity={identity}
      idlFactory={idlFactory}
      onRequest={handleRequest}
      onRequestError={errorToast}
      onResponseError={handleResponseError}
    >
      {children}
    </ActorProvider>
  );
}
