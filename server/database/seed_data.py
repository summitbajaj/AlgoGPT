# seed_data.py

from database import SessionLocal
from models import Problem, TestCase, Example, Topic, DifficultyLevel

def get_or_create_topic(db, topic_name):
    """Retrieve a topic if it exists, otherwise create it."""
    topic = db.query(Topic).filter_by(name=topic_name).first()
    if not topic:
        topic = Topic(name=topic_name)
        db.add(topic)
        db.commit()
        db.refresh(topic)
    return topic

def seed():
    db = SessionLocal()
    stack = get_or_create_topic(db, "Stack")  # Fetches existing topic or creates it

#     # 1) Create Topics
#     arrays_hashing = Topic(name="Arrays & Hashing")
#     two_pointers = Topic(name="Two Pointers")
#     stack = Topic(name="Stack")
#     db.add_all([arrays_hashing, two_pointers, stack])
#     db.commit()

#     # 2) Create "Two Sum" Problem
#     two_sum = Problem(
#         title="Two Sum",
#         description="""Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

# You may assume that each input would have exactly one solution, and you may not use the same element twice.

# You can return the answer in any order.

# Example 1:
# Input: nums = [2,7,11,15], target = 9
# Output: [0,1]
# Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

# Example 2:
# Input: nums = [3,2,4], target = 6
# Output: [1,2]

# Example 3:
# Input: nums = [3,3], target = 6
# Output: [0,1]
# """,
#         difficulty=DifficultyLevel.EASY,
#         constraints="""1 <= nums.length <= 10^5
# -10^9 <= nums[i] <= 10^9
# -10^9 <= target <= 10^9"""
#     )

#     # Link some topics to "Two Sum"
#     two_sum.topics.append(arrays_hashing)  # e.g., typically "Arrays & Hashing"
#     # You could also do:
#     # two_sum.topics.append(two_pointers)
#     # if you believe it belongs to that category as well

#     db.add(two_sum)
#     db.commit()
#     db.refresh(two_sum)  # Load the new problem ID

#     # 3) Create Examples for "Two Sum" (user-visible samples)
#     ex1 = Example(
#         problem_id=two_sum.id,
#         input_data="nums = [2,7,11,15], target = 9",
#         output_data="[0,1]",
#         explanation="Because nums[0] + nums[1] == 9, we return [0, 1]."
#     )
#     ex2 = Example(
#         problem_id=two_sum.id,
#         input_data="nums = [3,2,4], target = 6",
#         output_data="[1,2]",
#         explanation="Indices 1 and 2 sum up to 6."
#     )
#     ex3 = Example(
#         problem_id=two_sum.id,
#         input_data="nums = [3,3], target = 6",
#         output_data="[0,1]",
#         explanation="Indices 0 and 1 sum up to 6."
#     )
#     db.add_all([ex1, ex2, ex3])
#     db.commit()

#     # 4) Create Official Test Cases (hidden or used for judging)
#     # In this example, we match them exactly to the examples, but you
#     # could add additional hidden test cases as well.
#     tc1 = TestCase(problem_id=two_sum.id, input_data="[2,7,11,15], 9", expected_output="[0,1]")
#     tc2 = TestCase(problem_id=two_sum.id, input_data="[3,2,4], 6", expected_output="[1,2]")
#     tc3 = TestCase(problem_id=two_sum.id, input_data="[3,3], 6", expected_output="[0,1]")
#     db.add_all([tc1, tc2, tc3])
#     db.commit()

#     # 5) (Optional) Check each Example is found among official test cases
#     examples = db.query(Example).filter_by(problem_id=two_sum.id).all()
#     for ex in examples:
#         matching_tc = db.query(TestCase).filter_by(
#             problem_id=two_sum.id,
#             input_data=ex.input_data.replace("nums = ", ""),  # or some parse step
#             expected_output=ex.output_data
#         ).first()

#         if not matching_tc:
#             print(f"[Warning] Example {ex.id} not found in official test cases.")
#         else:
#             print(f"[OK] Example {ex.id} corresponds to TestCase {matching_tc.id}")

        # 3) Create "Valid Parentheses" Problem
    valid_parentheses = Problem(
        title="Valid Parentheses",
        description="""Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.""",
        difficulty=DifficultyLevel.EASY,
        constraints="""1 <= s.length <= 10^4
s consists of parentheses only '()[]{}'.""",
        starter_code="""
class Solution:
    def isValid(self, s: str) -> bool:
        pass
"""
    )
    valid_parentheses.topics.append(stack)
    db.add(valid_parentheses)
    db.commit()
    db.refresh(valid_parentheses)

    # Examples for "Valid Parentheses"
    examples_vp = [
        Example(problem_id=valid_parentheses.id, input_data="s = \"()\"", output_data="true", explanation="'()' is valid."),
        Example(problem_id=valid_parentheses.id, input_data="s = \"()[]{}\"", output_data="true", explanation="All brackets are correctly closed."),
        Example(problem_id=valid_parentheses.id, input_data="s = \"(]\"", output_data="false", explanation="Mismatch of brackets."),
        Example(problem_id=valid_parentheses.id, input_data="s = \"([])\"", output_data="true", explanation="Nested brackets correctly closed."),
    ]
    db.add_all(examples_vp)
    db.commit()

    # Test Cases for "Valid Parentheses"
    test_cases_vp = [
        TestCase(problem_id=valid_parentheses.id, input_data="()", expected_output="true"),
        TestCase(problem_id=valid_parentheses.id, input_data="()[]{}", expected_output="true"),
        TestCase(problem_id=valid_parentheses.id, input_data="(]", expected_output="false"),
        TestCase(problem_id=valid_parentheses.id, input_data="([])", expected_output="true"),
        TestCase(problem_id=valid_parentheses.id, input_data="{[()]}", expected_output="true"),
        TestCase(problem_id=valid_parentheses.id, input_data="({[)]}", expected_output="false"),
    ]
    db.add_all(test_cases_vp)
    db.commit()

    db.close()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed()
