import Link from "next/link";

// Ley 81 de 2019: consentimiento específico, informado e inequívoco para la entrevista con IA.
export function TextoConsentimientoIA() {
  return (
    <span>
      Acepto que una IA me entreviste por voz. Mi voz se convierte en texto con el servicio de voz de Google (Chrome) y mis
      respuestas, <b>sin mi nombre ni datos de contacto</b>, se envían a Google Gemini para generar preguntas y una evaluación.
      En la capa gratuita, Google puede usar ese contenido para mejorar sus productos. La empresa verá la transcripción, un
      resumen y un puntaje orientativo. Puedo colgar en cualquier momento.{" "}
      <Link href="/privacidad" target="_blank" className="underline">
        Más información
      </Link>
    </span>
  );
}
