-- Secure Art Gallery
-- Test Data

INSERT INTO Users
    (user_id, username, password_hash, role, created_by, created_at) VALUES
    (1, 'pparker', '$2b$10$Tb45AiuCqRvHESi9N701SeZDCtfRLTyOtgwLo.0N3/rlziu2iPCt6', 'admin', NULL, '2026-09-18 21:52:36'),
    (2, 'srodgers', '$2b$10$lP5H0NOmu/SU/w72ikIA0e.gvhQNUYSGUiW.n/gFG59rpVweIeiNK', 'employee', 1, '2026-09-19 21:52:36'),
    (3, 'sstrange', '$2b$10$zLL/u17VWxBSXvj/mFCdverMCCbe0w/wlle6CHF1l1ksBKJI7Vu02', 'guest', 2, '2026-09-21 21:52:36');


INSERT INTO Galleries
    (gallery_id, name, capacity, description, image_url) VALUES
    (101, 'Animals', 30, 'A gallery about animals', 'animals.png'),
    (102, 'Nature', 30, 'A gallery about nature', 'nature.png'),
    (103, 'Food', 30, 'A gallery about food', 'food.png');


INSERT INTO Rooms
    (room_id, gallery_id, name, capacity, description, image_url) VALUES
    (11, 101, 'Dogs', 15, 'A room of dog pictures', NULL),
    (12, 101, 'Cats', 15, 'A room of cat pictures', NULL),
    (13, 102, 'Water', 15, 'A room of water pictures', NULL),
    (14, 102, 'Forest', 15, 'A room of forest pictures', NULL),
    (15, 103, 'Cake', 15, 'A room of cake pictures', NULL),
    (16, 103, 'Pie', 15, 'A room of pie pictures', NULL);


INSERT INTO Paintings
    (painting_id, room_id, name, image_url) VALUES
    -- Dogs
    (1001, 11, 'Dog Painting 1', 'Animals/dog1.jpg'),
    (1002, 11, 'Dog Painting 2', 'Animals/dog2.jpg'),
    (1003, 11, 'Dog Painting 3', 'Animals/dog3.jpg'),
    (1004, 11, 'Dog Painting 4', NULL),
    (1005, 11, 'Dog Painting 5', NULL),
    (1006, 11, 'Dog Painting 6', NULL),

    -- Cats
    (1007, 12, 'Cat Painting 1', NULL),
    (1008, 12, 'Cat Painting 2', NULL),
    (1009, 12, 'Cat Painting 3', NULL),
    (1010, 12, 'Cat Painting 4', NULL),
    (1011, 12, 'Cat Painting 5', NULL),
    (1012, 12, 'Cat Painting 6', NULL),

    -- Water
    (1013, 13, 'Water Painting 1', NULL),
    (1014, 13, 'Water Painting 2', NULL),
    (1015, 13, 'Water Painting 3', NULL),
    (1016, 13, 'Water Painting 4', NULL),
    (1017, 13, 'Water Painting 5', NULL),
    (1018, 13, 'Water Painting 6', NULL),

    -- Forest
    (1019, 14, 'Forest Painting 1', NULL),
    (1020, 14, 'Forest Painting 2', NULL),
    (1021, 14, 'Forest Painting 3', NULL),
    (1022, 14, 'Forest Painting 4', NULL),
    (1023, 14, 'Forest Painting 5', NULL),
    (1024, 14, 'Forest Painting 6', NULL),

    -- Cake
    (1025, 15, 'Cake Painting 1', NULL),
    (1026, 15, 'Cake Painting 2', NULL),
    (1027, 15, 'Cake Painting 3', NULL),
    (1028, 15, 'Cake Painting 4', NULL),
    (1029, 15, 'Cake Painting 5', NULL),
    (1030, 15, 'Cake Painting 6', NULL),

    -- Pie
    (1031, 16, 'Pie Painting 1', NULL),
    (1032, 16, 'Pie Painting 2', NULL),
    (1033, 16, 'Pie Painting 3', NULL),
    (1034, 16, 'Pie Painting 4', NULL),
    (1035, 16, 'Pie Painting 5', NULL),
    (1036, 16, 'Pie Painting 6', NULL);


COMMIT;