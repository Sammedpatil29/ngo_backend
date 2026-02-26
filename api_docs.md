# API Documentation

Base URL: `/api` (Depending on your app configuration)

## Media (Gallery & Headers)

The Media API has been restructured to organize images into categories (e.g., "Header Images", "Events").

| Method | Endpoint | Description | Body / Notes |
| :--- | :--- | :--- | :--- |
| `GET` | `/media` | Get all media categories with nested images | Returns the hierarchical JSON structure. |
| `POST` | `/media/category` | Create a new media category | `{ "name": "Events", "url": "..." }` |
| `PUT` | `/media/category/:id` | Update a category | `{ "name": "...", "url": "..." }` |
| `DELETE` | `/media/category/:id` | Delete a category | Deletes the category. (Check cascade behavior for images). |
| `POST` | `/media/image` | Add an image to a category | `{ "place": "...", "url": "...", "categoryId": 1 }` |
| `PUT` | `/media/image/:id` | Update an image | `{ "place": "...", "url": "...", "isActive": true }` |
| `DELETE` | `/media/image/:id` | Delete an image | - |

## Home & General

| Method | Endpoint | Description | Body / Notes |
| :--- | :--- | :--- | :--- |
| `GET` | `/home` | Get aggregated data for homepage | Returns Banners, Services, Team, News, and Reviews. |
| `POST` | `/home/upload` | Upload an image file | `multipart/form-data` with key `image`. Returns public URL. |

## Donations

| Method | Endpoint | Description | Body / Notes |
| :--- | :--- | :--- | :--- |
| `POST` | `/donations` | Create a donation order | `{ "donorName": "...", "amount": 100, "email": "...", "phone": "..." }` |
| `GET` | `/donations` | Get all donations | - |
| `GET` | `/donations/donors` | Get list of unique donors | - |
| `GET` | `/donations/phone/:phone` | Get donor details by phone | - |
| `POST` | `/donations/verify` | Verify Razorpay payment | `{ "razorpay_order_id": "...", "razorpay_payment_id": "...", "razorpay_signature": "..." }` |
| `GET` | `/donations/status/:orderId`| Check payment status | - |

## News

| Method | Endpoint | Description | Body / Notes |
| :--- | :--- | :--- | :--- |
| `GET` | `/news` | Get all news items | - |
| `GET` | `/news/:id` | Get news by ID | - |
| `POST` | `/news` | Create news item | `{ "title": "...", "description": "...", "image": "..." }` |
| `PUT` | `/news/:id` | Update news item | - |
| `DELETE` | `/news/:id` | Delete news item | - |

## Services

| Method | Endpoint | Description | Body / Notes |
| :--- | :--- | :--- | :--- |
| `GET` | `/services` | Get all services | - |
| `GET` | `/services/active` | Get active services | - |
| `GET` | `/services/:id` | Get service by ID | - |
| `POST` | `/services` | Create service | `{ "title": "...", "description": "...", "image": "..." }` |
| `PUT` | `/services/:id` | Update service | - |
| `DELETE` | `/services/:id` | Delete service | - |

## Reviews

| Method | Endpoint | Description | Body / Notes |
| :--- | :--- | :--- | :--- |
| `GET` | `/reviews` | Get all reviews | - |
| `GET` | `/reviews/active` | Get active reviews | - |
| `GET` | `/reviews/:id` | Get review by ID | - |
| `POST` | `/reviews` | Create review | `{ "name": "...", "ratings": 5, "comment": "..." }` |
| `PUT` | `/reviews/:id` | Update review | - |
| `DELETE` | `/reviews/:id` | Delete review | - |

## Volunteers

| Method | Endpoint | Description | Body / Notes |
| :--- | :--- | :--- | :--- |
| `GET` | `/volunteers` | Get all volunteers | - |
| `GET` | `/volunteers/active` | Get active volunteers | - |
| `GET` | `/volunteers/:id` | Get volunteer by ID | - |
| `POST` | `/volunteers` | Create volunteer | `{ "name": "...", "role": "...", "image": "..." }` |
| `PUT` | `/volunteers/:id` | Update volunteer | - |
| `DELETE` | `/volunteers/:id` | Delete volunteer | - |

## Banners

| Method | Endpoint | Description | Body / Notes |
| :--- | :--- | :--- | :--- |
| `GET` | `/banners` | Get all banners | - |
| `GET` | `/banners/:id` | Get banner by ID | - |
| `POST` | `/banners` | Create banner | `{ "title": "...", "image": "...", "highlight": "..." }` |
| `PUT` | `/banners/:id` | Update banner | - |
| `DELETE` | `/banners/:id` | Delete banner | - |

## Team Members

| Method | Endpoint | Description | Body / Notes |
| :--- | :--- | :--- | :--- |
| `GET` | `/team-members` | Get all team members | - |
| `GET` | `/team-members/:id` | Get team member by ID | - |
| `POST` | `/team-members` | Create team member | `{ "name": "...", "role": "...", "image": "..." }` |
| `PUT` | `/team-members/:id` | Update team member | - |
| `DELETE` | `/team-members/:id` | Delete team member | - |

## Users (Authentication)

| Method | Endpoint | Description | Body / Notes |
| :--- | :--- | :--- | :--- |
| `GET` | `/users` | Get all users | - |
| `POST` | `/users` | Register new user | `{ "name": "...", "email": "...", "password": "..." }` |
| `POST` | `/users/login` | Login | `{ "email": "...", "password": "..." }` |