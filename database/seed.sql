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
    (13, 102, 'Flowers', 15, 'A room of flower pictures', NULL),
    (14, 102, 'Trees', 15, 'A room of tree pictures', NULL),
    (15, 103, 'Cake', 15, 'A room of cake pictures', NULL),
    (16, 103, 'Cookies', 15, 'A room of cookie pictures', NULL);


INSERT INTO Paintings
    (painting_id, room_id, name, image_url) VALUES
    -- Dogs
    (1001, 11, 'Dog Picture 1', 'animals/dog/dog1.jpg'),
    (1002, 11, 'Dog Picture 2', 'animals/dog/dog2.jpg'),
    (1003, 11, 'Dog Picture 3', 'animals/dog/dog3.jpg'),
    (1004, 11, 'Dog Picture 4', 'animals/dog/dog4.jpg'),
    (1005, 11, 'Dog Picture 5', 'animals/dog/dog5.jpg'),
    (1006, 11, 'Dog Picture 6', 'animals/dog/dog6.jpg'),

    -- Cats
    (1007, 12, 'Cat Picture 1', 'animals/cats/cat1.jpg'),
    (1008, 12, 'Cat Picture 2', 'animals/cats/cat2.jpg'),
    (1009, 12, 'Cat Picture 3', 'animals/cats/cat3.jpg'),
    (1010, 12, 'Cat Picture 4', 'animals/cats/cat4.jpg'),
    (1011, 12, 'Cat Picture 5', 'animals/cats/cat5.jpg'),
    (1012, 12, 'Cat Picture 6', 'animals/cats/cat6.jpg'),

    -- Flower
    (1013, 13, 'Flower Picture 1', 'nature/flowers/flower1.jpg'),
    (1014, 13, 'Flower Picture 2', 'nature/flowers/flower2.jpg'),
    (1015, 13, 'Flower Picture 3', 'nature/flowers/flower3.jpg'),
    (1016, 13, 'Flower Picture 4', 'nature/flowers/flower4.jpg'),
    (1017, 13, 'Flower Picture 5', 'nature/flowers/flower5.jpg'),
    (1018, 13, 'Flower Picture 6', 'nature/flowers/flower6.jpg'),

    -- Tree
    (1019, 14, 'Tree Picture 1', 'nature/trees/tree1.jpg'),
    (1020, 14, 'Tree Picture 2', 'nature/trees/tree2.jpg'),
    (1021, 14, 'Tree Picture 3', 'nature/trees/tree3.jpg'),
    (1022, 14, 'Tree Picture 4', 'nature/trees/tree4.jpg'),
    (1023, 14, 'Tree Picture 5', 'nature/trees/tree5.jpg'),
    (1024, 14, 'Tree Picture 6', 'nature/trees/tree6.jpg'),

    -- Cake
    (1025, 15, 'Cake Picture 1', 'food/cake/cake1.jpg'),
    (1026, 15, 'Cake Picture 2', 'food/cake/cake2.jpg'),
    (1027, 15, 'Cake Picture 3', 'food/cake/cake3.jpg'),
    (1028, 15, 'Cake Picture 4', 'food/cake/cake4.jpg'),
    (1029, 15, 'Cake Picture 5', 'food/cake/cake5.jpg'),
    (1030, 15, 'Cake Picture 6', 'food/cake/cake6.jpg'),

    -- Cookie
    (1031, 16, 'Cookie Picture 1', 'food/cookies/cookie1.jpg'),
    (1032, 16, 'Cookie Picture 2', 'food/cookies/cookie2.jpg'),
    (1033, 16, 'Cookie Picture 3', 'food/cookies/cookie3.jpg'),
    (1034, 16, 'Cookie Picture 4', 'food/cookies/cookie4.jpg'),
    (1035, 16, 'Cookie Picture 5', 'food/cookies/cookie5.jpg'),
    (1036, 16, 'Cookie Picture 6', 'food/cookies/cookie6.jpg');


COMMIT;