
export interface ShowIfCondition {
  field: string;
  value: boolean | string | number | (string | number | boolean)[];
  negate?: boolean;
}

export interface FieldConfig {
  label?: string;
  type?: 'text' | 'textarea' | 'switch' | 'checkbox' | 'boolean' | 'number' | 'range' | 'select' | 'radio' | 'email' | 'password' | 'tel' | 'url' | 'date' | 'time' | 'color' | 'file';
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  multiple?: boolean;
  options?: Array<{ value: string; label: string }>;
  showIf?: ShowIfCondition;
}

export interface FormConfig {
  [key: string]: FieldConfig;
}

export interface FormData {
  [key: string]: string | number | boolean | string[];
}
const defaultProductFormConfig: FormConfig = {
  name: {
    label: 'Nombre del Producto',
    type: 'text',
    required: true,
    placeholder: 'Ingresa el nombre del producto'
  },
  price: {
    label: 'Precio',
    type: 'number',
    required: true,
    min: 0,
    step: 0.01,
    placeholder: '0.00'
  },
  description: {
    label: 'Descripción',
    type: 'textarea',
    placeholder: 'Descripción del producto (opcional)'
  },
  image: {
    label: 'Imagen',
    type: 'url',
    placeholder: '/images/product-image.svg'
  },
  category: {
    label: 'Categoría',
    type: 'select',
    required: true,
    options: getCategories()
  },
  fallback: {
    label: 'Emoji de respaldo',
    type: 'text',
    placeholder: '🍔',
  },
  id: {
    label: 'ID',
    type: 'number',
    readonly: true
  }
};
function getCategories(){
  const categories = () => [
    { id: 'meals', name: 'Comidas', icon: 'restaurant' },
    { id: 'burgers', name: 'Hamburguesas', icon: 'lunch_dining' },
    { id: 'sandwiches', name: 'Sandwiches', icon: 'fastfood' },
    { id: 'sides', name: 'Postres', icon: 'fastfood' },
    { id: 'drinks', name: 'Bebidas', icon: 'local_drink' }
  ]
  return categories().map(item => ({
    value: item.id,
    label: item.name
  }))
}
const defaultProductData: FormData = {
  id: '',
  name: 'Nuevo Producto',
  price: 0.00,
  description: '',
  image: '/images/default-product.svg',
  fallback: '🍽️'
};
export { defaultProductFormConfig, defaultProductData };