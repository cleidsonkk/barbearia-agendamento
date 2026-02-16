import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireBarberContext } from "@/lib/apiAuth";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function uploadBuffer(buffer: Buffer, folder: string) {
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        overwrite: false,
        transformation: [{ fetch_format: "auto", quality: "auto" }],
      },
      (error, result) => {
        if (error || !result?.secure_url) return reject(error ?? new Error("Upload failed"));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

export async function POST(req: Request) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });
  if (!process.env.CLOUDINARY_URL) {
    return NextResponse.json({ error: "CLOUDINARY_URL nao configurada." }, { status: 500 });
  }

  cloudinary.config({ secure: true });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo nao enviado." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Formato invalido. Use JPG, PNG ou WEBP." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem muito grande. Limite de 5MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadBuffer(buffer, `barbearia/services/${ctx.barber.id}`);
  return NextResponse.json({ ok: true, url });
}
