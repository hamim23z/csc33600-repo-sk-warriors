"use client";

import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@stackframe/stack";
import { useStackApp } from "@stackframe/stack";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Typography,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  TextField,
  Stack,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import InfoIcon from "@mui/icons-material/Info";
import ContactMailIcon from "@mui/icons-material/ContactMail";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import RemoveIcon from "@mui/icons-material/Remove";
import RateReviewIcon from "@mui/icons-material/RateReview";
import AddIcon from "@mui/icons-material/Add";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import AccountBoxIcon from "@mui/icons-material/AccountBox";

const libraries = ["places"];

export default function MapPage() {
  const router = useRouter();
  const app = useStackApp();
  const user = useUser({ or: "redirect" });

  const [userLocation, setUserLocation] = useState(null);
  const [delis, setDelis] = useState([]);
  const [selectedDeli, setSelectedDeli] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showError, setShowError] = useState(false);
  const mapRef = useRef(null);

  // Review related states (if you guys wanna make a separate page)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  //code for favorites
  const [favorites, setFavorites] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    async function loadFavorites() {
      try {
        const response = await fetch("/api/favorites", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // ✅ just in case; safe for cookie-based auth
        });

        const text = await response.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (err) {
          console.error("❌ Failed to parse favorites JSON:", err, text);
        }

        setFavorites(data.favorites || []);

        if (selectedDeli) {
          setIsFavorite(
            (data.favorites || []).some(
              (fav) => fav.deli_id === selectedDeli.deli_id
            )
          );
        }
      } catch (error) {
        console.error("Failed to load favorites:", error);
      }
    }

    loadFavorites();
  }, [selectedDeli]);

  // Add this function to handle favorite toggle
  const handleToggleFavorite = async () => {
    console.log("🔥 CLICKED FAVORITE");

    if (!selectedDeli) {
      console.warn("❌ No selectedDeli");
      return;
    }

    try {
      const method = isFavorite ? "DELETE" : "POST";

      const response = await fetch("/api/favorites", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // ✅ ensures cookie session is included
        body: JSON.stringify({
          store_name: selectedDeli.store_name,
          street_address: selectedDeli.street_address,
        }),
      });

      const result = await response.json();
      console.log("✅ Favorite response:", result);

      if (!response.ok) throw new Error(result.error || "Favorite failed");

      setIsFavorite(!isFavorite);
      setErrorMessage(
        isFavorite ? "Removed from favorites" : "Added to favorites!"
      );
      setShowError(true);

      setFavorites((prev) =>
        isFavorite
          ? prev.filter(
              (fav) =>
                fav.store_name !== selectedDeli.store_name ||
                fav.street_address !== selectedDeli.street_address
            )
          : [
              ...prev,
              {
                store_name: selectedDeli.store_name,
                street_address: selectedDeli.street_address,
              },
            ]
      );
    } catch (err) {
      console.error("🔥 Favorite request error:", err);
      setErrorMessage("Favorite failed. Try again.");
      setShowError(true);
    }
  };

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          // Handle geolocation errors gracefully
          let errorMsg = "Unable to access your location";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg =
                "Location access denied. Please enable location services in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMsg = "Location request timed out.";
              break;
            default:
              errorMsg =
                "An unknown error occurred while getting your location.";
          }

          console.log(errorMsg);
          setErrorMessage(errorMsg);
          setShowError(true);

          // Default to New York City
          setUserLocation({ lat: 40.7128, lng: -74.006 });
        }
      );
    } else {
      setErrorMessage("Geolocation is not supported by this browser.");
      setShowError(true);
      setUserLocation({ lat: 40.7128, lng: -74.006 });
    }
  }, []);

  useEffect(() => {
    async function fetchDelis() {
      try {
        const res = await fetch(
          "https://data.cityofnewyork.us/resource/ud4g-9x9z.json"
        );
        const data = await res.json();
        setDelis(data);
      } catch (error) {
        console.error("Failed to fetch deli data:", error);
        setErrorMessage("Failed to fetch deli data. Please try again later.");
        setShowError(true);
      }
    }
    fetchDelis();
  }, []);

  const handleSignOut = async () => {
    try {
      await userState.signOut(); // stackframe sign-out
      router.push("/sign-in");
    } catch (err) {
      console.error("Sign-out error:", err);
      setErrorMessage("Failed to sign out. Please try again.");
      setShowError(true);
    }
  };

  const handleCloseError = () => {
    setShowError(false);
  };

  // Review dialog handlers
  const handleOpenReviewDialog = () => {
    setReviewDialogOpen(true);
  };

  const handleCloseReviewDialog = () => {
    setReviewDialogOpen(false);
  };

  const handleSubmitReview = () => {
    console.log({
      deliId: selectedDeli?.id || selectedDeli?.store_name,
      rating,
      comment: reviewComment,
      userId: user?.id,
      timestamp: new Date().toISOString(),
    });

    // This is temporary just to test the submit message
    setReviewSubmitted(true);
    setReviewDialogOpen(false);

    setTimeout(() => {
      setRating(0);
      setReviewComment("");
      setReviewSubmitted(false);
    }, 3000);
  };

  const actions = [
    {
      icon: <HomeIcon />,
      name: "Home",
      onClick: () => router.push("/"),
    },
    {
      icon: <AccountBoxIcon />,
      name: "Profile",
      onClick: () => router.push("/profile"),
    },
    {
      icon: <LocalOfferIcon />,
      name: "Pricing",
      onClick: () => router.push("/pricing"),
    },
    {
      icon: <ContactMailIcon />,
      name: "Contact",
      onClick: () => router.push("/contact"),
    },
    {
      icon: <LoginIcon />,
      name: "Sign In",
      onClick: () => router.push("/sign-in"),
    },
    {
      icon: <LogoutIcon color="error" />,
      name: "Sign Out",
      onClick: handleSignOut,
    },
    {
      icon: <RemoveIcon />,
      name: "Remove Deli",
      onClick: () => router.push("/remove-deli"),
    },
    {
      icon: <AddIcon />,
      name: "Add Deli",
      onClick: () => router.push("/deli-listing"),
    },
    {
      icon: <AttachMoneyIcon />,
      name: "Add Price ",
      onClick: () => router.push("/add-price/deli_id"),
    },
  ];

  if (loadError)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
        }}
      >
        <Typography variant="h5" color="error">
          Failed to load map
        </Typography>
        <Typography variant="body1">
          Please check your internet connection and try again.
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => window.location.reload()}
        >
          Reload Page
        </Button>
      </Box>
    );

  if (!isLoaded || userLocation === null)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Typography variant="h5">Loading map...</Typography>
      </Box>
    );

  const glowingDotSVG =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#4285F4" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#4285F4" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="28" fill="url(#glow)" />
        <circle cx="32" cy="32" r="10" fill="#4285F4" stroke="white" stroke-width="2" />
      </svg>
    `);

  return (
    <>
      {/*this is basically the section for showing the information INSIDE the popup*/}
      {selectedDeli && (
        <Box
          sx={{
            position: "fixed",
            top: 24,
            left: 24,
            width: { xs: "90%", sm: "550px" },
            bgcolor: "#fff",
            color: "#111",
            p: 3,
            borderRadius: 2,
            boxShadow: 5,
            zIndex: 1300,
          }}
        >
          <Typography variant="h6" gutterBottom>
            {selectedDeli.store_name || "Unnamed Deli"}
          </Typography>

          {selectedDeli.street_address && (
            <Typography variant="body2">
              <strong>Address:</strong> {selectedDeli.street_address}
            </Typography>
          )}
          {selectedDeli.borough && (
            <Typography variant="body2">
              <strong>Borough:</strong> {selectedDeli.borough}
            </Typography>
          )}
          {selectedDeli.zip_code && (
            <Typography variant="body2" gutterBottom>
              <strong>Zip Code:</strong> {selectedDeli.zip_code}
            </Typography>
          )}

          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>Special Deals:</strong> Coming soon!
          </Typography>

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<RateReviewIcon />}
              onClick={handleOpenReviewDialog}
              sx={{ flex: 1 }}
            >
              Review me
            </Button>

            <Button
              variant="contained"
              color={isFavorite ? "secondary" : "primary"}
              onClick={handleToggleFavorite}
              sx={{ flex: 1 }}
            >
              {isFavorite ? "Favorited" : "Favorite"}
            </Button>

            <Button
              variant="outlined"
              onClick={() => setSelectedDeli(null)}
              sx={{ flex: 1 }}
            >
              Close
            </Button>
          </Box>
        </Box>
      )}

      {/*this is the section that actually shows the map + the user location and marker*/}
      {/* Map */}
      <Box sx={{ height: "100vh", width: "100vw" }}>
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={userLocation}
          zoom={15}
          mapTypeId="roadmap"
          onLoad={(map) => (mapRef.current = map)}
        >
          {/* User marker */}
          <Marker
            position={userLocation}
            icon={{
              url: glowingDotSVG,
              scaledSize: new window.google.maps.Size(64, 64),
              anchor: new window.google.maps.Point(32, 32),
            }}
          />

          {delis.map((deli, index) => {
            if (!deli.latitude || !deli.longitude) return null;

            return (
              <Marker
                key={index}
                position={{
                  lat: parseFloat(deli.latitude),
                  lng: parseFloat(deli.longitude),
                }}
                title={deli.store_name}
                onClick={() => setSelectedDeli(deli)}
              />
            );
          })}
        </GoogleMap>
      </Box>

      {/* Review Dialog - Modal panel with correct styling and centering */}
      <Box
        sx={{
          display: reviewDialogOpen ? "flex" : "none",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
        onClick={handleCloseReviewDialog}
      >
        <Box
          sx={{
            width: { xs: "90%", sm: "550px" },
            maxWidth: "100%",
            borderRadius: 1,
            overflow: "hidden",
            backgroundColor: "#333",
            boxShadow: "0 24px 38px rgba(0,0,0,0.25)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography
              variant="h5"
              sx={{
                color: "white",
                fontWeight: 600,
                fontSize: "1.5rem",
              }}
            >
              Review {selectedDeli?.store_name || "this deli"}
            </Typography>
          </Box>

          {/* Content area */}
          <Box sx={{ p: 4, bgcolor: "#1c1c1c" }}>
            {/* Rating section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ color: "white", mb: 3, ml: 2 }}>
                Your Rating:
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
                <Rating
                  name="deli-rating"
                  value={rating}
                  onChange={(event, newValue) => {
                    setRating(newValue);
                  }}
                  precision={1}
                  size="large"
                  sx={{
                    "& .MuiRating-icon": {
                      color: "gray",
                      fontSize: "3rem",
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Comment field */}
            <Box
              component="div"
              sx={{
                borderRadius: 1,
                border: "2px solid #2196f3",
                position: "relative",
                mb: 3,
                height: "120px",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -12,
                  left: 12,
                  paddingX: 1,
                  backgroundColor: "#1c1c1c",
                  color: "#999",
                  fontSize: "0.85rem",
                }}
              >
                Your Review (Optional)
              </Box>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Tell us about your experience..."
                style={{
                  width: "100%",
                  height: "100%",
                  padding: "12px",
                  backgroundColor: "#1c1c1c",
                  color: "white",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
              />
            </Box>

            {/* Buttons */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 3,
              }}
            >
              <Button
                onClick={handleCloseReviewDialog}
                sx={{
                  px: 4,
                  py: 1.5,
                  color: "white",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  backgroundColor: "transparent",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.05)",
                  },
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={handleSubmitReview}
                disabled={rating === 0}
                sx={{
                  px: 4,
                  py: 1.5,
                  backgroundColor: "white",
                  color: "#333",
                  fontWeight: "bold",
                  borderRadius: "4px",
                  "&:hover": {
                    backgroundColor: "#f5f5f5",
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "#555",
                    color: "#aaa",
                  },
                }}
              >
                Submit Review
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={reviewSubmitted}
        autoHideDuration={3000}
        onClose={() => setReviewSubmitted(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert severity="success" variant="filled">
          Thank you! Your review has been submitted.
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseError} severity="warning" variant="filled">
          {errorMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={showError}
        autoHideDuration={3000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={() => setShowError(false)}
          severity={isFavorite ? "warning" : "success"}
          variant="filled"
        >
          {errorMessage}
        </Alert>
      </Snackbar>

      {/*this is the new appbar, its basically using mui speed dial component.*/}
      <Box sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 1400 }}>
        <SpeedDial
          ariaLabel="Site Navigation"
          icon={<SpeedDialIcon />}
          direction="left"
        >
          {actions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={action.onClick}
            />
          ))}
        </SpeedDial>
      </Box>
    </>
  );
}
