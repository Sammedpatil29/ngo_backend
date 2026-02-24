# API Documentation

Base URL: `http://localhost:3000/api`

## Users

### Get All User
- **URL:** `/users`
- **Method:** `GET`
- **Description:** Retrieves a list of all registered users.
- **Success Response:**
  - **Code:** 200 OK
  - **Content:** `[{ "id": 1, "name": "John", "email": "john@example.com", ... }]`

### Create User
- **URL:** `/users`
- **Method:** `POST`
- **Description:** Creates a new user.
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword"
  }
  ```
- **Success Response:**
  - **Code:** 201 Created
  - **Content:** `{ "id": 1, "name": "John Doe", ... }`

### Login User
- **URL:** `/users/login`
- **Method:** `POST`
- **Description:** Authenticates a user and returns a JWT token.
- **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "securepassword"
  }
  ```
- **Success Response:**
  - **Code:** 200 OK
  - **Content:** `{ "message": "Login successful", "token": "...", "user": {...} }`

---

## Volunteers

### Get All Volunteers
- **URL:** `/volunteers`
- **Method:** `GET`
- **Description:** Retrieves a list of all volunteers.
- **Success Response:**
  - **Code:** 200 OK

### Get Volunteer by ID
- **URL:** `/volunteers/:id`
- **Method:** `GET`
- **Description:** Retrieves a specific volunteer by their ID.
- **Success Response:**
  - **Code:** 200 OK
- **Error Response:**
  - **Code:** 404 Not Found

### Create Volunteer
- **URL:** `/volunteers`
- **Method:** `POST`
- **Description:** Adds a new volunteer.
- **Request Body:**
  ```json
  {
    "name": "Jane Smith",
    "role": "Coordinator",
    "image": "http://example.com/image.jpg",
    "isActive": true
  }
  ```
- **Success Response:**
  - **Code:** 201 Created

### Update Volunteer
- **URL:** `/volunteers/:id`
- **Method:** `PUT`
- **Description:** Updates an existing volunteer's details.
- **Request Body:** (Any combination of fields)
  ```json
  {
    "role": "Senior Coordinator",
    "isActive": false
  }
  ```
- **Success Response:**
  - **Code:** 200 OK

### Delete Volunteer
- **URL:** `/volunteers/:id`
- **Method:** `DELETE`
- **Description:** Removes a volunteer from the database.
- **Success Response:**
  - **Code:** 204 No Content

---

## Team Members

### Get All Team Members
- **URL:** `/team-members`
- **Method:** `GET`
- **Description:** Retrieves a list of all team members.

### Get Team Member by ID
- **URL:** `/team-members/:id`
- **Method:** `GET`
- **Description:** Retrieves a specific team member by ID.

### Create Team Member
- **URL:** `/team-members`
- **Method:** `POST`
- **Description:** Adds a new team member.
- **Request Body:** Similar to Volunteer model (name, role, image, isActive).

### Update Team Member
- **URL:** `/team-members/:id`
- **Method:** `PUT`
- **Description:** Updates an existing team member.

### Delete Team Member
- **URL:** `/team-members/:id`
- **Method:** `DELETE`
- **Description:** Removes a team member.

---

## Banners

### Get All Banners
- **URL:** `/banners`
- **Method:** `GET`
- **Description:** Retrieves a list of all banners.

### Get Banner by ID
- **URL:** `/banners/:id`
- **Method:** `GET`
- **Description:** Retrieves a specific banner by ID.

### Create Banner
- **URL:** `/banners`
- **Method:** `POST`
- **Description:** Adds a new banner.
- **Request Body:**
  ```json
  {
    "title": "Welcome",
    "highlight": "To our NGO",
    "image": "http://example.com/banner.jpg",
    "isActive": true
  }
  ```

### Update Banner
- **URL:** `/banners/:id`
- **Method:** `PUT`
- **Description:** Updates an existing banner.

### Delete Banner
- **URL:** `/banners/:id`
- **Method:** `DELETE`
- **Description:** Removes a banner.

---

## Services

### Get All Services
- **URL:** `/services`
- **Method:** `GET`
- **Description:** Retrieves a list of all services.

### Get Service by ID
- **URL:** `/services/:id`
- **Method:** `GET`
- **Description:** Retrieves a specific service by ID.

### Create Service
- **URL:** `/services`
- **Method:** `POST`
- **Description:** Adds a new service.
- **Request Body:**
  ```json
  {
    "title": "Education",
    "description": "Providing education to children.",
    "image": "http://example.com/service.jpg",
    "isActive": true
  }
  ```

### Update Service
- **URL:** `/services/:id`
- **Method:** `PUT`
- **Description:** Updates an existing service.

### Delete Service
- **URL:** `/services/:id`
- **Method:** `DELETE`
- **Description:** Removes a service.

---

## News

### Get All News
- **URL:** `/news`
- **Method:** `GET`
- **Description:** Retrieves a list of all news items.

### Get News by ID
- **URL:** `/news/:id`
- **Method:** `GET`
- **Description:** Retrieves a specific news item by ID.

### Create News
- **URL:** `/news`
- **Method:** `POST`
- **Description:** Adds a new news item.
- **Request Body:**
  ```json
  {
    "title": "New Event",
    "image": "http://example.com/news.jpg",
    "isActive": true
  }
  ```

### Update News
- **URL:** `/news/:id`
- **Method:** `PUT`
- **Description:** Updates an existing news item.

### Delete News
- **URL:** `/news/:id`
- **Method:** `DELETE`
- **Description:** Removes a news item.

---

## Media

### Get All Media
- **URL:** `/media`
- **Method:** `GET`
- **Description:** Retrieves a list of all media items.

### Get Media by ID
- **URL:** `/media/:id`
- **Method:** `GET`
- **Description:** Retrieves a specific media item by ID.

### Create Media
- **URL:** `/media`
- **Method:** `POST`
- **Description:** Adds a new media item.
- **Request Body:**
  ```json
  {
    "place": "Community Center",
    "url": "http://example.com/photo.jpg",
    "isActive": true
  }
  ```

### Update Media
- **URL:** `/media/:id`
- **Method:** `PUT`
- **Description:** Updates an existing media item.

### Delete Media
- **URL:** `/media/:id`
- **Method:** `DELETE`
- **Description:** Removes a media item.

---

## Home

### Get Home Data
- **URL:** `/home`
- **Method:** `GET`
- **Description:** Retrieves aggregated data for the home page including banners, services, team members, and news.
- **Success Response:**
  - **Code:** 200 OK
  - **Content:**
    ```json
    {
      "banners": [...],
      "services": [...],
      "teamMembers": [...],
      "news": [...]
    }
    ```

### Upload Home Image
- **URL:** `/home/upload`
- **Method:** `POST`
- **Description:** Uploads an image to cloud storage via the home route.
- **Form Data:**
  - `image`: File
- **Success Response:**
  - **Code:** 200 OK
  - **Content:** `{ "data": "https://storage.googleapis.com/..." }`

---

## Donations

### Create Donation
- **URL:** `/donations`
- **Method:** `POST`
- **Description:** Records a new donation.
- **Request Body:**
  ```json
  {
    "donorName": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "amount": 500.00,
    "currency": "INR",
    "message": "Keep up the good work!",
    "transactionId": "txn_12345",
    "paymentStatus": "completed",
    "isBloodDonor": true,
    "bloodGroup": "O+"
  }
  ```
- **Success Response:**
  - **Code:** 201 Created

### Get All Donations
- **URL:** `/donations`
- **Method:** `GET`
- **Description:** Retrieves a list of all donations.
- **Success Response:**
  - **Code:** 200 OK

### Get Donation by Phone
- **URL:** `/donations/phone/:phone`
- **Method:** `GET`
- **Description:** Retrieves the name and email for the latest donation associated with a given phone number.
- **URL Params:**
  - `phone=[string]` (Required)
- **Success Response:**
  - **Code:** 200 OK
  - **Content:**
    ```json
    {
      "donorName": "John Doe",
      "email": "john@example.com"
    }
    ```
- **Error Response:**
  - **Code:** 404 Not Found
  - **Content:** `{ "message": "No donation found with that phone number." }`

---

## General Upload

### Upload Image
- **URL:** `/upload`
- **Method:** `POST`
- **Description:** General endpoint to upload an image to cloud storage.
- **Form Data:**
  - `image`: File
- **Success Response:**
  - **Code:** 200 OK
  - **Content:** `{ "url": "https://storage.googleapis.com/..." }`