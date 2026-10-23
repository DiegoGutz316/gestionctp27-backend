/**
 * Clasificacion de lo que se siembra en la huerta del colegio.
 *
 * Son las familias que se manejan en la zona: hortalizas, verduras, granos
 * basicos, raices y tuberculos, frutas y hierbas. `OTRO` evita que la lista
 * bloquee un cultivo que no encaje.
 *
 * Hortaliza y verdura se solapan —toda verdura es una hortaliza— pero el
 * colegio las nombra por separado, asi que la lista sigue su uso.
 */
export enum TipoCultivo {
  HORTALIZA = 'HORTALIZA',
  VERDURA = 'VERDURA',
  GRANO_BASICO = 'GRANO_BASICO',
  RAIZ_TUBERCULO = 'RAIZ_TUBERCULO',
  FRUTA = 'FRUTA',
  HIERBA_AROMATICA = 'HIERBA_AROMATICA',
  OTRO = 'OTRO',
}

export const ETIQUETA_TIPO_CULTIVO: Record<TipoCultivo, string> = {
  [TipoCultivo.HORTALIZA]: 'Hortaliza',
  [TipoCultivo.VERDURA]: 'Verdura',
  [TipoCultivo.GRANO_BASICO]: 'Grano básico',
  [TipoCultivo.RAIZ_TUBERCULO]: 'Raíz o tubérculo',
  [TipoCultivo.FRUTA]: 'Fruta',
  [TipoCultivo.HIERBA_AROMATICA]: 'Hierba aromática',
  [TipoCultivo.OTRO]: 'Otro',
};
