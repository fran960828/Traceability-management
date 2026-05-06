import { AuthProvider } from './auth/context/auth.context'; 
import { RouterProvider } from "react-router-dom";
import { router } from "./app.router";

function App() {
  return (
      <AuthProvider>
        <RouterProvider router={router}></RouterProvider>
      </AuthProvider>
      
    
  );
}

export default App;
