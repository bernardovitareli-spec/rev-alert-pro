import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const installDomMutationGuard = () => {
  const win = window as Window & { __mcDomMutationGuardInstalled?: boolean };
  if (win.__mcDomMutationGuardInstalled) return;

  win.__mcDomMutationGuardInstalled = true;

  const originalInsertBefore = Node.prototype.insertBefore;
  const originalRemoveChild = Node.prototype.removeChild;

  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn('[dom-guard] Referência externa ao React detectada; inserindo no fim do nó pai.');
      return originalInsertBefore.call(this, newNode, null) as T;
    }

    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };

  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      console.warn('[dom-guard] Remoção externa ao React ignorada para manter a tela ativa.');
      return child;
    }

    return originalRemoveChild.call(this, child) as T;
  };
};

installDomMutationGuard();

createRoot(document.getElementById("root")!).render(<App />);
