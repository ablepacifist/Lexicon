import React, { createContext, useState } from 'react';

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  // User is an object (BUUUUURRRN)
  // For now the user state is not important, but it will be used to store user information
  const [user, setUser] = useState(undefined); // <-- CHANGED from null to undefined

  return (
    // UserContext.Provider is a component that provides the user state to its children
    // The children in this case is the entire application
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
