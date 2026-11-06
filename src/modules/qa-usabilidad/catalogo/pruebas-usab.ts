/**
 * Catálogo fijo USAB-01…10 (docs/qa/usabilidad-real).
 * No inventar pruebas adicionales.
 */
export type ModuloUsab =
  | 'LIBRO_CAJA'
  | 'PECUARIA'
  | 'AGRICOLA'
  | 'REPORTES_AVISOS';

export interface PruebaUsabDefinicion {
  codigo: string;
  modulo: ModuloUsab;
  nombre: string;
  objetivo: string;
  instruccion: string;
  resultadoEsperado: string;
}

export const PRUEBAS_USAB: readonly PruebaUsabDefinicion[] = [
  {
    codigo: 'USAB-01',
    modulo: 'LIBRO_CAJA',
    nombre: 'Registrar un ingreso de ₡85.000',
    objetivo:
      'Comprobar si el participante registra un ingreso y comprende el saldo',
    instruccion:
      'Hoy ingresaron ochenta y cinco mil colones por la venta de carne de la unidad pecuaria. Registre ese movimiento y dígame cuánto dinero queda disponible.',
    resultadoEsperado:
      'Asiento de ingreso ₡85.000; saldo coherente; sin ingreso y egreso positivos a la vez.',
  },
  {
    codigo: 'USAB-02',
    modulo: 'LIBRO_CAJA',
    nombre: 'Solicitar fondo inicial de ₡150.000',
    objetivo: 'Ver si encuentra cómo solicitar el fondo pendiente',
    instruccion:
      'La unidad agrícola necesita empezar el periodo con ciento cincuenta mil colones de fondo. Trámite esa solicitud en el sistema.',
    resultadoEsperado: 'Fondo agrícola solicitado con ₡150.000.',
  },
  {
    codigo: 'USAB-03',
    modulo: 'LIBRO_CAJA',
    nombre: 'Corregir un asiento mal registrado',
    objetivo: 'Evaluar corrección de un movimiento existente',
    instruccion:
      'En el libro de la unidad pecuaria hay un gasto de cinco mil colones que se anotó mal: en realidad fueron tres mil. Corrija ese registro y confirme el saldo.',
    resultadoEsperado: 'Asiento corregido y saldo recalculado.',
  },
  {
    codigo: 'USAB-04',
    modulo: 'PECUARIA',
    nombre: 'Registrar una ternera Holstein',
    objetivo: 'Alta de animal con categoría Ternero/a',
    instruccion:
      'Nació una ternera Holstein a la que llamaremos Estrella. Debe quedar registrada en el inventario bovino con el código BOV-QA-01.',
    resultadoEsperado: 'Animal BOV-QA-01 / Estrella registrado y activo.',
  },
  {
    codigo: 'USAB-05',
    modulo: 'PECUARIA',
    nombre: 'Registrar producción de leche',
    objetivo: 'Registrar producción asociada a Luna',
    instruccion:
      'Esta mañana Luna produjo doce litros de leche. Deje constancia de esa producción en el sistema.',
    resultadoEsperado: 'Producción de leche vinculada a Luna.',
  },
  {
    codigo: 'USAB-06',
    modulo: 'PECUARIA',
    nombre: 'Registrar estado de salud animal',
    objetivo: 'Encontrar Salud animal y registrar observación',
    instruccion:
      'Revisaron a Luna y se ve sana, sin signos de enfermedad. Registre esa observación de salud.',
    resultadoEsperado: 'Registro de salud para Luna.',
  },
  {
    codigo: 'USAB-07',
    modulo: 'AGRICOLA',
    nombre: 'Registrar una siembra de lechuga',
    objetivo: 'Sembrar en cama disponible del invernadero 1',
    instruccion:
      'Hay que sembrar lechuga en una cama libre del invernadero 1. Registre la siembra con los datos que usted considere razonables.',
    resultadoEsperado: 'Siembra de lechuga en cama disponible.',
  },
  {
    codigo: 'USAB-08',
    modulo: 'AGRICOLA',
    nombre: 'Registrar una cosecha parcial de tomate',
    objetivo: 'Cosechar sin cerrar el ciclo por accidente',
    instruccion:
      'Ya se pueden recolectar algunos tomates, pero el cultivo sigue en la cama. Registre una cosecha parcial; el ciclo no debe darse por terminado.',
    resultadoEsperado: 'Cosecha registrada; siembra de tomate sigue activa.',
  },
  {
    codigo: 'USAB-09',
    modulo: 'REPORTES_AVISOS',
    nombre: 'Publicar un aviso institucional',
    objetivo: 'Publicar aviso con fecha válida e imagen opcional',
    instruccion:
      'Hay que avisar a la comunidad sobre la feria agrícola del mes próximo. Publique un aviso institucional para que se vea en la página del colegio.',
    resultadoEsperado: 'Aviso activo publicado por rol autorizado.',
  },
  {
    codigo: 'USAB-10',
    modulo: 'REPORTES_AVISOS',
    nombre: 'Consultar y exportar un informe económico',
    objetivo: 'Localizar el informe y exportarlo a Excel',
    instruccion:
      'Necesita revisar cómo van las cuentas de la unidad pecuaria en este periodo y llevarse una copia en Excel para la junta.',
    resultadoEsperado: 'Informe consultado y Excel descargado.',
  },
] as const;

export const CODIGOS_PRUEBA_USAB = PRUEBAS_USAB.map((p) => p.codigo);

export function pruebaPorCodigo(codigo: string): PruebaUsabDefinicion | undefined {
  return PRUEBAS_USAB.find((p) => p.codigo === codigo);
}

/** Metadato del piloto técnico (no es sesión con usuarios reales). */
export const PILOTO_TECNICO = {
  origen: 'PILOTO_TECNICO' as const,
  descripcion:
    'Ensayo automatizado Codex (10/10 PASS). No cuenta como usabilidad con docentes.',
  referencia: 'docs/qa/usabilidad-real/11-informe-piloto.md',
};
