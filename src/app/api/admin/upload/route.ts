import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminFromReq } from "@/lib/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const adminId = await getAdminFromReq(req);
    if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido. Solo imágenes." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Archivo muy grande. Máximo 5MB." }, { status: 400 });
    }

    const cloudinaryUrl = process.env.CLOUDINARY_URL || "";
    const match = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);

    if (!match) {
      return NextResponse.json({ error: "Cloudinary no configurado" }, { status: 500 });
    }

    const [, apiKey, apiSecret, cloudName] = match;
    const timestamp = Math.round(Date.now() / 1000);

    const signature = crypto
      .createHash("sha1")
      .update(`folder=polla-mundialista&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("api_key", apiKey);
    uploadData.append("timestamp", timestamp.toString());
    uploadData.append("signature", signature);
    uploadData.append("folder", "polla-mundialista");

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: uploadData,
    });

    const result = await res.json();

    if (result.secure_url) {
      return NextResponse.json({ url: result.secure_url });
    } else {
      console.error("Cloudinary error:", result.error?.message || result);
      return NextResponse.json({ error: result.error?.message || "Error al subir imagen" }, { status: 500 });
    }
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json({ error: "Error interno al subir imagen" }, { status: 500 });
  }
}
