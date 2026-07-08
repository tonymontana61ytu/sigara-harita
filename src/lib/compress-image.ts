export function compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context alinamadi"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Blob olusturulamadi"));
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Resim yuklenemedi"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Dosya okunamadi"));
    reader.readAsDataURL(file);
  });
}
