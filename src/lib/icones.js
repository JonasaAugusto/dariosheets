/**
 * Os ícones, por nome.
 *
 * Um mapa explícito, e não `import * as lucide`, porque importar o pacote
 * inteiro carregaria mais de mil ícones num aparelho de entrada para usar
 * oito. Aqui o bundler leva só estes.
 *
 * Zero emoji na interface. Emoji tem desenho diferente em cada aparelho, muda
 * de tamanho junto com a fonte e não aceita cor — três motivos pelos quais ele
 * nunca foi ícone, só parecia.
 */
export {
  Route, Ban, Building2, Truck, Wine, Circle, MapPin,
  Plus, Trash2, Check, Loader2, X, Pencil, List,
  TriangleAlert, CircleCheck, RefreshCw,
} from "@lucide/svelte";
