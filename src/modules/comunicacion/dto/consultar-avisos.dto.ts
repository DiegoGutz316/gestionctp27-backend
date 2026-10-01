import { OmitType } from '@nestjs/swagger';

import { PaginarDto } from '../../../common/paginacion/dto/paginar.dto';

/**
 * Backlog 5.6: "Los usuarios autorizados pueden visualizar los avisos
 * activos".
 *
 * No lleva filtros: el criterio pide los activos, y el estado no se elige
 * desde aqui porque los inactivos no se muestran a los usuarios generales.
 *
 * Hereda `pagina` y `limite` de `PaginarDto` pero omite `q`: este listado no
 * tiene busqueda por texto libre. Sin paginacion la consulta cargaria todos
 * los avisos publicados, que solo crecen.
 */
export class ConsultarAvisosDto extends OmitType(PaginarDto, ['q'] as const) {}
