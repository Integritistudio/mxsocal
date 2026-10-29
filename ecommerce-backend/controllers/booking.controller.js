const { Booking, BookingAccessory } = require("../models/booking.model");
const { Product, ProductAvailability } = require("../models/product.model");
const { emitNotification } = require("../sockets/index");

function parseTimeToMinutes(t) {
  if (!t) return 0;
  const parts = t.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function slotsOverlap(slotsA, slotsB) {
  if (!Array.isArray(slotsA) || !Array.isArray(slotsB)) return false;
  for (const a of slotsA) {
    const aStart = parseTimeToMinutes(a.start);
    const aEnd = parseTimeToMinutes(a.end);
    for (const b of slotsB) {
      const bStart = parseTimeToMinutes(b.start);
      const bEnd = parseTimeToMinutes(b.end);
      if (aStart < bEnd && bStart < aEnd) return true;
    }
  }
  return false;
}

exports.createBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      productId,
      bookingDate,
      slots = [],
      durationHours,
      accessories = [],
      notes,
    } = req.body;

    if (
      !productId ||
      !bookingDate ||
      !Array.isArray(slots) ||
      slots.length === 0
    )
      return res.status(400).json({
        message: "productId, bookingDate and at least one slot are required",
      });

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const existing = await Booking.findAll({
      where: { productId, bookingDate },
    });
    for (const ex of existing) {
      if (slotsOverlap(slots, ex.slots)) {
        return res
          .status(409)
          .json({ message: "Requested slots conflict with existing booking" });
      }
    }

    // compute base price
    const base = parseFloat(product.pricePerDay) || 0;

    let accessoriesTotal = 0;
    for (const a of accessories) {
      const qty = a.quantity || 1;
      const price = parseFloat(a.price || 0);
      accessoriesTotal += qty * price;
    }

    const totalPrice = Number((base + accessoriesTotal).toFixed(2));

    const booking = await Booking.create({
      userId,
      productId,
      bookingDate,
      slots,
      durationHours: durationHours || null,
      accessories: accessories || null,
      totalPrice,
      notes: notes || null,
    });

    if (Array.isArray(accessories) && accessories.length > 0) {
      const accRows = accessories.map((a) => ({
        bookingId: booking.id,
        productId: a.productId,
        size: a.size || null,
        quantity: a.quantity || 1,
        price: a.price || null,
      }));
      await BookingAccessory.bulkCreate(accRows);
    }

    const full = await Booking.findByPk(booking.id, {
      include: [{ model: BookingAccessory, as: "accessoryItems" }],
    });

    // Emit notifications to admin and the user
    const payload = {
      type: "booking_created",
      bookingId: booking.id,
      userId,
      message: "New booking created",
      booking: full,
    };
    try {
      emitNotification("admin", payload);
      emitNotification(`user:${userId}`, payload);
    } catch (err) {
      console.warn("Failed to emit booking notification", err.message || err);
    }

    res.status(201).json(full);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const user = req.user;
    const where = {};
    if (user.role !== "admin") where.userId = user.id;

    const bookings = await Booking.findAll({
      where,
      include: [{ model: BookingAccessory, as: "accessoryItems" }],
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const id = req.params.id;
    const booking = await Booking.findByPk(id, {
      include: [{ model: BookingAccessory, as: "accessoryItems" }],
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    const user = req.user;
    if (user.role !== "admin" && booking.userId !== user.id)
      return res.status(403).json({ message: "Forbidden" });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const booking = await Booking.findByPk(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    const user = req.user;
    if (user.role !== "admin" && booking.userId !== user.id)
      return res.status(403).json({ message: "Forbidden" });

    booking.status = status;
    await booking.save();

    const payload = {
      type: "booking_status",
      bookingId: booking.id,
      status,
      message: `Booking ${status}`,
    };
    try {
      emitNotification("admin", payload);
      emitNotification(`user:${booking.userId}`, payload);
    } catch (err) {
      console.warn("Failed to emit status notification", err.message || err);
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const id = req.params.id;
    const booking = await Booking.findByPk(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    const user = req.user;
    if (user.role !== "admin" && booking.userId !== user.id)
      return res.status(403).json({ message: "Forbidden" });

    booking.status = "cancelled";
    await booking.save();

    const payload = {
      type: "booking_cancelled",
      bookingId: booking.id,
      message: "Booking cancelled",
    };
    try {
      emitNotification("admin", payload);
      emitNotification(`user:${booking.userId}`, payload);
    } catch (err) {
      console.warn("Failed to emit cancel notification", err.message || err);
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
