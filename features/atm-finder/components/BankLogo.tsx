"use client";

import Image from "next/image";
import { useState } from "react";
import { getBankIdentity } from "@/lib/atms/banks";

type BankLogoProps = {
  name: string;
  compact?: boolean;
  priority?: boolean;
};

export function BankLogo({ name, compact = false, priority = false }: BankLogoProps) {
  const identity = getBankIdentity(name);
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(identity.logoFile) && !logoFailed;
  const logoPath = `/bank-logos/${identity.logoFile}`;
  const useWhiteMask = showLogo
    && identity.logoFile?.endsWith(".svg")
    && identity.variant !== "volksbank";
  const className = [
    "bank-logo",
    `bank-logo--${identity.variant}`,
    useWhiteMask ? "bank-logo--mask" : showLogo ? "bank-logo--with-image" : "",
    compact ? "bank-logo--compact" : "",
  ].filter(Boolean).join(" ");

  return (
    <span className={className} aria-hidden>
      {useWhiteMask ? (
        <>
          <span
            className="bank-logo-mask"
            style={{ maskImage: `url(${logoPath})`, WebkitMaskImage: `url(${logoPath})` }}
          />
          <Image
            className="bank-logo-probe"
            src={logoPath}
            alt=""
            width={1}
            height={1}
            unoptimized
            priority={priority}
            onError={() => setLogoFailed(true)}
          />
        </>
      ) : showLogo ? (
        <Image
          className="bank-logo-image"
          src={logoPath}
          alt=""
          width={32}
          height={32}
          unoptimized
          priority={priority}
          onError={() => setLogoFailed(true)}
        />
      ) : identity.code}
    </span>
  );
}
