/**
 * Listas guardadas en el navegador (no hay servidor). Si el almacenamiento no
 * está disponible (modo privado, bloqueado), se lee vacío y no se guarda.
 */

export function leerLista<T>(clave: string): T[] {
  try {
    const lista = JSON.parse(localStorage.getItem(clave) ?? '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function escribirLista<T>(clave: string, lista: T[], maximo: number): void {
  try {
    localStorage.setItem(clave, JSON.stringify(lista.slice(0, maximo)));
  } catch {
    // Sin almacenamiento: la app sigue funcionando, solo no recuerda.
  }
}

/** Inserta o reemplaza por clave; lo último queda primero. */
export function guardarPrimero<T>(clave: string, item: T, igual: (a: T) => boolean, maximo: number): void {
  escribirLista(clave, [item, ...leerLista<T>(clave).filter((x) => !igual(x))], maximo);
}
