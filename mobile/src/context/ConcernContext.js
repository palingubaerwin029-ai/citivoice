import React, { createContext, useContext, useState, useEffect } from "react";
import { ConcernService } from "../services/concernService";
import { useAuth } from "./AuthContext";

const ConcernContext = createContext(null);

export function ConcernProvider({ children }) {
  const [concerns, setConcerns] = useState([]);
  const [myConcerns, setMyConcerns] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // ── Only subscribe when user is logged in ──────────────────────────────────
  useEffect(() => {
    if (!user?.uid) {
      // User logged out — clear data
      setConcerns([]);
      setMyConcerns([]);
      setLoading(false);
      return;
    }

    // User logged in — start listening
    setLoading(true);

    const unsubAll = ConcernService.subscribeToConcerns((data) => {
      setConcerns(data);
      setLoading(false);
    });

    const unsubMine = ConcernService.subscribeToUserConcerns(
      user.uid,
      (data) => {
        setMyConcerns(data);
      },
    );

    return () => {
      unsubAll();
      unsubMine();
    };
  }, [user?.uid]);

  const addConcern = async (data) => {
    return await ConcernService.addConcern({
      ...data,
      userId: user.uid,
      userName: user.name,
      userBarangay: user.barangay,
    });
  };

  const updateConcern = async (id, updates) => {
    await ConcernService.updateConcern(id, updates);
  };

  const deleteConcern = async (id) => {
    await ConcernService.deleteConcern(id);
  };

  const toggleUpvote = async (concernId) => {
    await ConcernService.toggleUpvote(concernId, user.uid);
  };

  return (
    <ConcernContext.Provider
      value={{
        concerns,
        myConcerns,
        loading,
        addConcern,
        updateConcern,
        deleteConcern,
        toggleUpvote,
      }}
    >
      {children}
    </ConcernContext.Provider>
  );
}

export const useConcerns = () => useContext(ConcernContext);
