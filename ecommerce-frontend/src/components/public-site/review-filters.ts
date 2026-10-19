import type { ProductReview } from "./product-types";
export function filterReviews(reviews: ProductReview[], minimumRating: string, sort: string, photosOnly: boolean) {
  return reviews.filter(review => (!minimumRating || review.rating >= Number(minimumRating)) && (!photosOnly || review.images.length > 0)).sort((a, b) => {
    const newest = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (sort === "highest") return b.rating - a.rating || newest;
    if (sort === "lowest") return a.rating - b.rating || newest;
    return sort === "oldest" ? -newest : newest;
  });
}
