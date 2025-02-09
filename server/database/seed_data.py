# seed_data.py

from database import SessionLocal
from models import Problem, TestCase, Example, Topic, DifficultyLevel

def seed():
    db = SessionLocal()

    # 1) Create Topics
    arrays_hashing = Topic(name="Arrays & Hashing")
    two_pointers = Topic(name="Two Pointers")
    stack = Topic(name="Stack")
    db.add_all([arrays_hashing, two_pointers, stack])
    db.commit()

    # 2) Create "Two Sum" Problem
    two_sum = Problem(
        title="Two Sum",
        description="""Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]

Example 3:
Input: nums = [3,3], target = 6
Output: [0,1]
""",
        difficulty=DifficultyLevel.EASY,
        constraints="""1 <= nums.length <= 10^5
-10^9 <= nums[i] <= 10^9
-10^9 <= target <= 10^9"""
    )

    # Link some topics to "Two Sum"
    two_sum.topics.append(arrays_hashing)  # e.g., typically "Arrays & Hashing"
    # You could also do:
    # two_sum.topics.append(two_pointers)
    # if you believe it belongs to that category as well

    db.add(two_sum)
    db.commit()
    db.refresh(two_sum)  # Load the new problem ID

    # 3) Create Examples for "Two Sum" (user-visible samples)
    ex1 = Example(
        problem_id=two_sum.id,
        input_data="nums = [2,7,11,15], target = 9",
        output_data="[0,1]",
        explanation="Because nums[0] + nums[1] == 9, we return [0, 1]."
    )
    ex2 = Example(
        problem_id=two_sum.id,
        input_data="nums = [3,2,4], target = 6",
        output_data="[1,2]",
        explanation="Indices 1 and 2 sum up to 6."
    )
    ex3 = Example(
        problem_id=two_sum.id,
        input_data="nums = [3,3], target = 6",
        output_data="[0,1]",
        explanation="Indices 0 and 1 sum up to 6."
    )
    db.add_all([ex1, ex2, ex3])
    db.commit()

    # 4) Create Official Test Cases (hidden or used for judging)
    # In this example, we match them exactly to the examples, but you
    # could add additional hidden test cases as well.
    tc1 = TestCase(problem_id=two_sum.id, input_data="[2,7,11,15], 9", expected_output="[0,1]")
    tc2 = TestCase(problem_id=two_sum.id, input_data="[3,2,4], 6", expected_output="[1,2]")
    tc3 = TestCase(problem_id=two_sum.id, input_data="[3,3], 6", expected_output="[0,1]")
    db.add_all([tc1, tc2, tc3])
    db.commit()

    # 5) (Optional) Check each Example is found among official test cases
    examples = db.query(Example).filter_by(problem_id=two_sum.id).all()
    for ex in examples:
        matching_tc = db.query(TestCase).filter_by(
            problem_id=two_sum.id,
            input_data=ex.input_data.replace("nums = ", ""),  # or some parse step
            expected_output=ex.output_data
        ).first()

        if not matching_tc:
            print(f"[Warning] Example {ex.id} not found in official test cases.")
        else:
            print(f"[OK] Example {ex.id} corresponds to TestCase {matching_tc.id}")

    db.close()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed()
