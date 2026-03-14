/**
 * BoundedList: Una lista que mantiene automáticamente un máximo de elementos,
 * eliminando los más antiguos cuando se excede el límite.
 */
export class BoundedList<T> {
  private maxSize: number;
  private items: T[];

  constructor(maxSize: number = 10, initialItems: T[] = []) {
    this.maxSize = maxSize;
    // Si se pasan items iniciales, mantener solo los últimos maxSize
    this.items = initialItems.slice(-maxSize);
  }

  /**
   * Agrega un elemento a la lista
   * Si se excede el límite, elimina el más antiguo
   */
  add(item: T): this {
    this.items.push(item);
    if (this.items.length > this.maxSize) {
      this.items.shift(); // Elimina el primero (más antiguo)
    }
    return this;
  }

  /**
   * Verifica si un elemento existe en la lista
   */
  has(item: T): boolean {
    return this.items.includes(item);
  }

  /**
   * Retorna el número de elementos en la lista
   */
  get size(): number {
    return this.items.length;
  }

  /**
   * Retorna todos los elementos como array
   */
  values(): T[] {
    return [...this.items];
  }

  /**
   * Limpia todos los elementos de la lista
   */
  clear(): void {
    this.items = [];
  }

  /**
   * Permite usar la lista con Array.from() y spread operator
   */
  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }

  /**
   * Convierte la lista a JSON para almacenamiento
   */
  toJSON(): T[] {
    return this.items;
  }

  /**
   * Crea una BoundedList desde un array o JSON
   */
  static fromJSON<T>(data: T[], maxSize: number = 10): BoundedList<T> {
    return new BoundedList<T>(maxSize, data);
  }

  /**
   * Convierte la lista a un array
   */
  toArray(): T[] {
    return this.items;
  }

  /**
   * Retorna el número de elementos en la lista
   */
  length(): number {
    return this.items.length;
  }
}

