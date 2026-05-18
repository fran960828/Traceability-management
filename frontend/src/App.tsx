import { AuthProvider } from './auth/context/auth.context'; 
import { ModalProvider } from './shared/components/modal/context/ModalContext';
import { RouterProvider } from "react-router-dom";
import { router } from "./app.router";

function App() {
  return (
      <AuthProvider>
        <ModalProvider>
          <RouterProvider router={router}></RouterProvider>
        </ModalProvider>
      </AuthProvider>
      
    
  );
}

export default App;
