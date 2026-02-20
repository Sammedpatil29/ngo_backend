# API Documentation

Base URL: `http://localhost:3000/api`

## Users

### Get All Users
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