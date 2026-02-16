"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const images = [
  "/media/ambiente.jpg",
  "/media/corte.jpg",
  "/media/ferramentas.jpg",
  "/media/hero.jpg",
  "/media/cadeira.jpg",
  "/media/acabamento.jpg",
  "/media/tesoura.jpg",
  "/media/fade.jpg",
];

export function HomeGallery() {
  const [start, setStart] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStart((prev) => (prev + 1) % images.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const visible = useMemo(
    () => Array.from({ length: 6 }, (_, i) => images[(start + i) % images.length]),
    [start],
  );

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {visible.map((img, i) => (
        <div key={`${img}-${i}`} className="relative aspect-square overflow-hidden rounded-xl border border-white/10">
          <Image
            src={img}
            alt="Foto profissional da barbearia"
            fill
            sizes="(max-width: 640px) 45vw, 20vw"
            priority={i < 2}
            className="block h-full w-full object-cover transition duration-700 hover:scale-110"
          />
        </div>
      ))}
    </div>
  );
}
