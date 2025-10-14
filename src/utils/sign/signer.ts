// signer.ts
interface SignedData<T> {
  data: T;
  signature: string;
}

class DataSigner<T extends object> {
  private secretKey: string;

  /**
   * @param secretKey La clave secreta para generar y verificar firmas.
   */
  constructor(secretKey: string='default') {
    if (!secretKey) {
      throw new Error('La clave secreta no puede estar vacía.');
    }
    if (secretKey === 'default') {
      console.warn('Se está utilizando la clave por defecto. Se recomienda usar una clave personalizada.');
    }
    this.secretKey = secretKey;
  }

  /**
   * Firma un objeto de datos y devuelve el objeto con su firma.
   * @param data El objeto de datos a firmar.
   * @returns Una promesa que se resuelve con el objeto firmado.
   */
  async sign(data: T): Promise<SignedData<T>> {
    const dataString = JSON.stringify(data);
    const signature = await this.generateSignature(dataString);
    
    return {
      data,
      signature
    };
  }

  /**
   * Verifica la integridad de un objeto firmado.
   * @param signedData El objeto firmado que contiene los datos y la firma.
   * @returns Una promesa que se resuelve a `true` si la firma es válida, o `false` en caso contrario.
   */
  async verify(signedData: SignedData<T>): Promise<boolean> {
    const dataString = JSON.stringify(signedData.data);
    const expectedSignature = await this.generateSignature(dataString);
    
    return this.secureCompare(expectedSignature, signedData.signature);
  }

  /**
   * Genera una firma HMAC-SHA256 para una cadena de datos.
   * @param data La cadena de datos a firmar.
   * @returns La firma en formato hexadecimal.
   * @private
   */
  private async generateSignature(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.secretKey);
    const dataBuffer = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
    
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Compara dos cadenas de forma segura para prevenir ataques de temporización (timing attacks).
   * @param a La primera cadena.
   * @param b La segunda cadena.
   * @returns `true` si las cadenas son idénticas.
   * @private
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }
}
export { DataSigner }